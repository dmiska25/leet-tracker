import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

function DemoTabs() {
  return (
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">Tab One</TabsTrigger>
        <TabsTrigger value="two">Tab Two</TabsTrigger>
      </TabsList>

      <TabsContent value="one">Content One</TabsContent>
      <TabsContent value="two">Content Two</TabsContent>
    </Tabs>
  );
}

describe('Tabs component', () => {
  it('shows correct content when triggers are clicked', async () => {
    const user = userEvent.setup();
    render(<DemoTabs />);

    // Default tab content
    expect(screen.getByText(/Content One/i)).toBeInTheDocument();
    expect(screen.queryByText(/Content Two/i)).not.toBeInTheDocument();

    // Switch to second tab
    await user.click(screen.getByRole('button', { name: /Tab Two/i }));
    expect(screen.getByText(/Content Two/i)).toBeInTheDocument();
    expect(screen.queryByText(/Content One/i)).not.toBeInTheDocument();

    // Switch back
    await user.click(screen.getByRole('button', { name: /Tab One/i }));
    expect(screen.getByText(/Content One/i)).toBeInTheDocument();
    expect(screen.queryByText(/Content Two/i)).not.toBeInTheDocument();
  });
});
