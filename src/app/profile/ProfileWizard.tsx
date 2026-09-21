"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationHero } from "./RegistrationHero";
import { Step1Form, type Step1InitialValues } from "./Step1Form";
import { Step2Form, type Step2InitialValues, type WorkReferenceValue } from "./Step2Form";
import { Step3Form, type Step3InitialValues } from "./Step3Form";
import { Step4Form, type Step4InitialValues } from "./Step4Form";
import { LockedToast } from "./LockedToast";

const LOCKED_MESSAGE = "Your profile has been submitted and is locked. Contact us if something needs to change.";
const AVATAR_MISSING_MESSAGE = "Please upload a profile picture before you can submit.";
const SIGNATURE_MISSING_MESSAGE = "Please draw and save your signature before you can submit.";
const SUBMITTED_REDIRECT_DELAY_MS = 5000;

interface ProfileWizardProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  highestReachableStep: number;
  isSubmitted: boolean;
  editingUnlockedByAdmin: boolean;
  step1InitialValues: Step1InitialValues | null;
  step2InitialValues: Step2InitialValues | null;
  initialWorkReferences: WorkReferenceValue[];
  step3InitialValues: Step3InitialValues | null;
  step4InitialValues: Step4InitialValues | null;
  initialSignatureUrl: string | null;
}

/**
 * Owns which onboarding step is currently shown. The wizard always stays on
 * the single `/profile` URL — steps are switched client-side like tabs, never
 * via navigation, so progress within a session (e.g. unsaved Step 2 fields
 * after clicking back to Step 1) isn't lost to a route change.
 */
export function ProfileWizard({
  firstName,
  lastName,
  email,
  avatarUrl,
  highestReachableStep: initialHighestReachableStep,
  isSubmitted,
  editingUnlockedByAdmin,
  step1InitialValues,
  step2InitialValues,
  initialWorkReferences,
  step3InitialValues,
  step4InitialValues,
  initialSignatureUrl,
}: ProfileWizardProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(initialHighestReachableStep);
  const [highestReachableStep, setHighestReachableStep] = useState(initialHighestReachableStep);
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  function showToast(message: string, icon: string) {
    setToast({ message, icon });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }

  function showLockedToast() {
    showToast(LOCKED_MESSAGE, "lock");
  }

  function handleSelectStep(step: number) {
    if (step > highestReachableStep) return;
    setActiveStep(step);
  }

  function handleStep1Continue() {
    setHighestReachableStep((prev) => Math.max(prev, 2));
    setActiveStep(2);
  }

  function handleStep2Continue() {
    setHighestReachableStep((prev) => Math.max(prev, 3));
    setActiveStep(3);
  }

  function handleStep3Continue() {
    setHighestReachableStep((prev) => Math.max(prev, 4));
    setActiveStep(4);
  }

  function handleSubmitted() {
    setJustSubmitted(true);
    setTimeout(() => router.push("/"), SUBMITTED_REDIRECT_DELAY_MS);
  }

  const readOnly = isSubmitted && !editingUnlockedByAdmin;

  if (justSubmitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-gutter">
        <div className="max-w-md w-full text-center bg-surface-container-lowest rounded-2xl shadow-md p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-candidate-navy-dark flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[32px]" aria-hidden="true">
              check_circle
            </span>
          </div>
          <h1 className="text-headline-md text-candidate-text-heading">Your profile has been submitted</h1>
          <p className="text-body-md text-candidate-secondary">
            Thank you — our team will review your details shortly. Redirecting you to the homepage...
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="h-11 px-6 rounded-lg bg-candidate-navy-dark hover:bg-candidate-secondary text-white text-label-md font-bold transition-colors"
          >
            Continue Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <LockedToast message={toast?.message ?? null} icon={toast?.icon} />
      <RegistrationHero
        firstName={firstName}
        lastName={lastName}
        email={email}
        avatarUrl={avatarUrl}
        activeStep={activeStep}
        highestReachableStep={highestReachableStep}
        onSelectStep={handleSelectStep}
        isSubmitted={isSubmitted}
        editingUnlockedByAdmin={editingUnlockedByAdmin}
        onLockedInteraction={showLockedToast}
      />
      <div className="w-full py-10 px-gutter">
        <div className="max-w-4xl mx-auto">
          {activeStep === 1 && (
            <Step1Form
              initialValues={step1InitialValues}
              onContinue={handleStep1Continue}
              readOnly={readOnly}
              onLockedInteraction={showLockedToast}
            />
          )}
          {activeStep === 2 && (
            <Step2Form
              initialValues={step2InitialValues}
              initialWorkReferences={initialWorkReferences}
              onContinue={handleStep2Continue}
              readOnly={readOnly}
              onLockedInteraction={showLockedToast}
            />
          )}
          {activeStep === 3 && (
            <Step3Form
              initialValues={step3InitialValues}
              onContinue={handleStep3Continue}
              readOnly={readOnly}
              onLockedInteraction={showLockedToast}
            />
          )}
          {activeStep === 4 && (
            <Step4Form
              initialValues={step4InitialValues}
              initialSignatureUrl={initialSignatureUrl}
              onSubmitted={handleSubmitted}
              onAvatarMissing={() => showToast(AVATAR_MISSING_MESSAGE, "photo_camera")}
              onSignatureMissing={() => showToast(SIGNATURE_MISSING_MESSAGE, "draw")}
              readOnly={readOnly}
              onLockedInteraction={showLockedToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}
