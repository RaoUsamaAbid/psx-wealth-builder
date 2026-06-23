import { Router } from 'express';
import { recommendMonthlyBuys } from '@psx/engines';
import type { LedgerHolding } from '@psx/shared';
import type { AccountRepositories, SipPlanDoc, SipTransactionDoc } from '../account/repos.js';
import { asyncHandler } from '../async-handler.js';
import { requireAuth, type AuthedRequest } from '../auth/jwt.js';
import { loadUniverse, type Repositories } from '../repositories.js';
import { parsePortfolioRequest } from './parse.js';

type AccountResolver = () => Promise<AccountRepositories>;
type ReposResolver = () => Promise<Repositories>;

const planPublic = (plan: SipPlanDoc) => ({
  id: plan._id!.toString(),
  name: plan.name,
  request: plan.request,
  carriedCash: plan.carriedCash,
  estimatedFeeRate: plan.estimatedFeeRate,
  maxOrders: plan.maxOrders,
  nextInvestmentDate: plan.nextInvestmentDate,
  lastInvestedAt: plan.lastInvestedAt,
  status: plan.status,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

const transactionPublic = (transaction: SipTransactionDoc) => ({
  id: transaction._id!.toString(),
  type: transaction.type,
  symbol: transaction.symbol,
  shares: transaction.shares,
  price: transaction.price,
  amount: transaction.amount,
  fees: transaction.fees,
  date: transaction.date,
  note: transaction.note,
});

function parseOptionalNumber(
  body: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number
): { value?: number; error?: string } {
  if (body[key] === undefined) return { value: fallback };
  const value = Number(body[key]);
  if (!Number.isFinite(value) || value < min || value > max) {
    return { error: `${key} must be a number between ${min} and ${max}` };
  }
  return { value };
}

function holdingsFromTransactions(transactions: SipTransactionDoc[]): LedgerHolding[] {
  const shares = new Map<string, number>();
  for (const transaction of transactions) {
    if (!transaction.symbol || !transaction.shares) continue;
    const direction = transaction.type === 'sell' ? -1 : transaction.type === 'buy' ? 1 : 0;
    if (direction === 0) continue;
    shares.set(
      transaction.symbol,
      (shares.get(transaction.symbol) ?? 0) + direction * transaction.shares
    );
  }
  return [...shares.entries()]
    .filter(([, count]) => count > 0)
    .map(([symbol, count]) => ({ symbol, shares: count }));
}

function nextMonthlyDate(from: Date): string {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

function monthlyCycleKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function personalSipsRouter(getAccount: AccountResolver, getRepos: ReposResolver): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const plans = await account.sipPlans.listByUser(req.userId!);
      res.json({ plans: plans.map(planPublic) });
    })
  );

  router.post(
    '/',
    asyncHandler(async (req: AuthedRequest, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const { request, error } = parsePortfolioRequest(body.request);
      if (!request) {
        res.status(400).json({ error });
        return;
      }
      const fee = parseOptionalNumber(body, 'estimatedFeeRate', 0.0025, 0, 0.1);
      const maxOrders = parseOptionalNumber(body, 'maxOrders', 4, 1, 10);
      if (fee.error || maxOrders.error || !Number.isInteger(maxOrders.value)) {
        res.status(400).json({
          error: fee.error ?? maxOrders.error ?? 'maxOrders must be an integer between 1 and 10',
        });
        return;
      }
      const nextInvestmentDate =
        typeof body.nextInvestmentDate === 'string' &&
        !Number.isNaN(Date.parse(body.nextInvestmentDate))
          ? new Date(body.nextInvestmentDate).toISOString()
          : null;
      const account = await getAccount();
      const plan = await account.sipPlans.create(req.userId!, {
        name: name.slice(0, 100),
        request,
        estimatedFeeRate: fee.value!,
        maxOrders: maxOrders.value!,
        nextInvestmentDate,
      });
      res.status(201).json({ plan: planPublic(plan) });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const plan = await account.sipPlans.findOne(req.userId!, req.params.id ?? '');
      if (!plan) {
        res.status(404).json({ error: 'SIP plan not found' });
        return;
      }
      const transactions = await account.sipTransactions.listByPlan(
        req.userId!,
        plan._id!.toString()
      );
      res.json({
        plan: planPublic(plan),
        holdings: holdingsFromTransactions(transactions),
        transactions: transactions.map(transactionPublic),
      });
    })
  );

  router.post(
    '/:id/recommendation',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const plan = await account.sipPlans.findOne(req.userId!, req.params.id ?? '');
      if (!plan) {
        res.status(404).json({ error: 'SIP plan not found' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const dividends = parseOptionalNumber(body, 'availableDividends', 0, 0, 1_000_000_000);
      if (dividends.error) {
        res.status(400).json({ error: dividends.error });
        return;
      }
      const [transactions, universe] = await Promise.all([
        account.sipTransactions.listByPlan(req.userId!, plan._id!.toString()),
        loadUniverse(await getRepos()),
      ]);
      const recommendation = recommendMonthlyBuys(
        universe,
        plan.request,
        holdingsFromTransactions(transactions),
        {
          carriedCash: plan.carriedCash,
          availableDividends: dividends.value,
          estimatedFeeRate: plan.estimatedFeeRate,
          maxOrders: plan.maxOrders,
        }
      );
      res.json(recommendation);
    })
  );

  router.post(
    '/:id/confirm',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const plan = await account.sipPlans.findOne(req.userId!, req.params.id ?? '');
      if (!plan) {
        res.status(404).json({ error: 'SIP plan not found' });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const dividends = parseOptionalNumber(body, 'availableDividends', 0, 0, 1_000_000_000);
      if (dividends.error) {
        res.status(400).json({ error: dividends.error });
        return;
      }
      const [transactions, universe] = await Promise.all([
        account.sipTransactions.listByPlan(req.userId!, plan._id!.toString()),
        loadUniverse(await getRepos()),
      ]);
      const recommendation = recommendMonthlyBuys(
        universe,
        plan.request,
        holdingsFromTransactions(transactions),
        {
          carriedCash: plan.carriedCash,
          availableDividends: dividends.value,
          estimatedFeeRate: plan.estimatedFeeRate,
          maxOrders: plan.maxOrders,
        }
      );
      if (recommendation.orders.length === 0) {
        res.status(409).json({ error: 'there are no recommended purchases to confirm' });
        return;
      }
      const investedDate = new Date();
      const investedAt = investedDate.toISOString();
      const cycleKey = monthlyCycleKey(investedDate);
      const claimed = await account.sipCycles.claim(req.userId!, plan._id!.toString(), cycleKey);
      if (!claimed) {
        res.status(409).json({ error: `the ${cycleKey} SIP cycle is already confirmed` });
        return;
      }
      try {
        await account.sipTransactions.createMany(
          req.userId!,
          plan._id!.toString(),
          recommendation.orders.map((order) => ({
            type: 'buy' as const,
            symbol: order.symbol,
            shares: order.shares,
            price: order.referencePrice,
            amount: order.grossCost,
            fees: order.estimatedFees,
            date: investedAt,
            note: `Confirmed monthly model buy plan (${cycleKey})`,
          }))
        );
        const nextInvestmentDate = nextMonthlyDate(investedDate);
        await account.sipPlans.recordCycle(
          req.userId!,
          plan._id!.toString(),
          recommendation.remainingCash,
          investedAt,
          nextInvestmentDate
        );
      } catch (error) {
        await account.sipCycles.release(req.userId!, plan._id!.toString(), cycleKey);
        throw error;
      }
      const updated = await account.sipPlans.findOne(req.userId!, plan._id!.toString());
      res.status(201).json({
        plan: planPublic(updated!),
        confirmedOrders: recommendation.orders,
      });
    })
  );

  router.delete(
    '/:id',
    asyncHandler(async (req: AuthedRequest, res) => {
      const account = await getAccount();
      const id = req.params.id ?? '';
      const deleted = await account.sipPlans.delete(req.userId!, id);
      if (!deleted) {
        res.status(404).json({ error: 'SIP plan not found' });
        return;
      }
      await account.sipTransactions.deleteByPlan(req.userId!, id);
      await account.sipCycles.deleteByPlan(req.userId!, id);
      res.status(204).end();
    })
  );

  return router;
}
