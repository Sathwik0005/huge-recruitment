import { AvatarUpload } from "./AvatarUpload";
import { CloseButton } from "./CloseButton";

const TOTAL_STEPS = 3;

const STEP_LABELS: Record<number, string> = {
  1: "Personal Details",
  2: "Work Information & References",
  3: "Proof of Right to Work & Bank Details",
};

interface RegistrationHeroProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  activeStep: number;
  highestReachableStep: number;
  onSelectStep: (step: number) => void;
  avatarSubmitError?: string | null;
}

export function RegistrationHero({
  firstName,
  lastName,
  email,
  avatarUrl,
  activeStep,
  highestReachableStep,
  onSelectStep,
  avatarSubmitError,
}: RegistrationHeroProps) {
  const stepLabel = STEP_LABELS[activeStep] ?? `Step ${activeStep}`;
  const progressPercent = Math.round((activeStep / TOTAL_STEPS) * 100);

  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-candidate-navy-dark text-white py-10 px-gutter relative overflow-hidden">
        <CloseButton />
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 flex flex-col gap-2">
              <div className="flex flex-row items-center gap-4">
                <AvatarUpload initialAvatarUrl={avatarUrl} />
                <div className="space-y-1.5 min-w-0">
                  <h1 className="text-headline-lg text-white tracking-tight truncate">
                    {firstName} {lastName}
                  </h1>
                  <p className="text-body-md text-candidate-secondary-fixed flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[18px] shrink-0" aria-hidden="true">
                      mail
                    </span>
                    <span className="truncate">{email}</span>
                  </p>
                </div>
              </div>
              {avatarSubmitError && (
                <p role="alert" aria-live="assertive" className="text-label-sm text-error bg-error-container text-on-error-container rounded-lg px-3 py-2 w-fit">
                  {avatarSubmitError}
                </p>
              )}
            </div>
            <div className="lg:col-span-4 bg-candidate-navy-surface/90 rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-candidate-secondary-fixed uppercase tracking-wider">
                  Registration Progress
                </span>
                <span className="text-headline-md text-white font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-candidate-navy-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-candidate-secondary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-label-sm text-candidate-secondary-fixed">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#A7F3D0] text-[16px]" aria-hidden="true">
                    timelapse
                  </span>
                  ~3 mins remaining
                </span>
                <span className="text-white">
                  Step {activeStep} of {TOTAL_STEPS}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-lowest shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-gutter">
          <nav aria-label="Registration steps" className="flex items-center gap-2 overflow-x-auto py-3 px-1">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => index + 1).map((step) => {
              const reachable = step <= highestReachableStep;
              const isActive = step === activeStep;
              return (
                <button
                  key={step}
                  type="button"
                  disabled={!reachable}
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => onSelectStep(step)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md shrink-0 shadow-sm transition-colors ${
                    isActive
                      ? "bg-candidate-navy-dark text-white"
                      : reachable
                        ? "bg-surface-container text-candidate-text-heading hover:bg-surface-container-high cursor-pointer"
                        : "bg-surface-container-low text-candidate-secondary opacity-40 cursor-not-allowed"
                  }`}
                >
                  {step}
                </button>
              );
            })}
            <div className="min-w-0 ml-2">
              <span className="block text-label-sm text-candidate-secondary uppercase tracking-wider">
                Step {activeStep} of {TOTAL_STEPS}
              </span>
              <span className="block text-label-md text-candidate-text-heading truncate">{stepLabel}</span>
            </div>
          </nav>
          <div className="h-1 bg-candidate-secondary rounded-t" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>
    </div>
  );
}
