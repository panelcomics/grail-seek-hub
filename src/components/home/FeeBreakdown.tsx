import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function FeeBreakdown() {
  const fees = [
    { item: "Listing Fee", fee: "$0" },
    { item: "Marketplace Fee", fee: "6.5% per completed sale" },
    { item: "Payment Processing", fee: "Stripe (2.9% + $0.30)" },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          How Grail Seeker Fees Work
        </h2>
        <div className="bg-card border rounded-lg p-6 mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{fee.item}</TableCell>
                  <TableCell className="text-right">{fee.fee}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-center text-muted-foreground">
          Our goal is to keep seller fees lower than big marketplaces while still covering platform and payment costs.
        </p>
      </div>
    </section>
  );
}
