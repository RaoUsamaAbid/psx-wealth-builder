import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../src/components/ui/Button';
import { SegmentedControl } from '../src/components/ui/Field';
import { Badge, Stat } from '../src/components/ui/misc';

describe('Button', () => {
  it('renders children and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Generate</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and non-interactive while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('SegmentedControl', () => {
  it('highlights the active option and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
        value="a"
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('display primitives', () => {
  it('Badge renders its content', () => {
    render(<Badge tone="emerald">live</Badge>);
    expect(screen.getByText('live')).toBeInTheDocument();
  });
  it('Stat shows label and value', () => {
    render(<Stat label="Future value" value="PKR 44.7M" />);
    expect(screen.getByText('Future value')).toBeInTheDocument();
    expect(screen.getByText('PKR 44.7M')).toBeInTheDocument();
  });
});
