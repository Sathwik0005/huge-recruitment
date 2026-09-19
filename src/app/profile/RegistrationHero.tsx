import { AvatarUpload } from "./AvatarUpload";
import { CloseButton } from "./CloseButton";

const TOTAL_STEPS = 6;

interface RegistrationHeroProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  currentStep: number;
  stepLabel: string;
}

export function RegistrationHero({
  firstName,
  lastName,
  email,
  avatarUrl,
  currentStep,
  stepLabel,
}: RegistrationHeroProps) {
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-candidate-navy-dark text-white py-10 px-gutter relative overflow-hidden">
        <CloseButton />
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 flex flex-row items-center gap-4">
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
                  Step {currentStep} of {TOTAL_STEPS}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface-container-lowest shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-gutter flex justify-center">
          <div className="py-3 px-4 flex items-center gap-3 relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-label-md shrink-0 bg-candidate-navy-dark text-white shadow-sm">
              {currentStep}
            </div>
            <div className="min-w-0">
              <span className="block text-label-sm text-candidate-secondary uppercase tracking-wider text-center">
                Step {currentStep} of {TOTAL_STEPS}
              </span>
              <span className="block text-label-md text-candidate-text-heading truncate text-center">
                {stepLabel}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-candidate-secondary rounded-t" />
          </div>
        </div>
      </section>
    </div>
  );
}
