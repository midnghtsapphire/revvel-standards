'use client';

interface Step {
  id: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Product URL', description: 'Enter your product link' },
  { id: 2, label: 'Scrape & Review', description: 'Verify extracted data' },
  { id: 3, label: 'Generate Ad Copy', description: 'AI writes your ads' },
  { id: 4, label: 'Creative & Export', description: 'Download your assets' },
];

interface WizardStepperProps {
  currentStep: number;
}

export default function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-10">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <li key={step.id} className={`flex-1 ${idx < STEPS.length - 1 ? 'pr-4' : ''}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>

                <div className="hidden sm:block">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 ml-2 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
