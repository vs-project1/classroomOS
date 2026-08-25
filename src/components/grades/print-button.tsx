"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Triggers the browser print dialog for the report card.
 * Hidden in print output via the `print:hidden` utility + print.css guards.
 */
export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="print:hidden no-print"
    >
      <Printer data-icon="inline-start" className="h-4 w-4" />
      Print Report Card
    </Button>
  );
}
