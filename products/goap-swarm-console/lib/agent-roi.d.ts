export function calculateAgentRoi(input: { hoursPerWeek: number; hourlyCost: number; automationPercent: number; monthlyPrice: number }): {
  monthlyHours: number; capacityValue: number; monthlyNetValue: number;
  annualNetValue: number; roiPercent: number | null; breakEvenHours: number | null;
};
