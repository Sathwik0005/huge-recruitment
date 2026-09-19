"use client";

import { useState } from "react";
import { RegistrationHero } from "./RegistrationHero";
import { Step1Form, type Step1InitialValues } from "./Step1Form";
import { Step2Form, type Step2InitialValues, type WorkReferenceValue } from "./Step2Form";

interface ProfileWizardProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  highestReachableStep: number;
  step1InitialValues: Step1InitialValues | null;
  step2InitialValues: Step2InitialValues | null;
  initialWorkReferences: WorkReferenceValue[];
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
  step1InitialValues,
  step2InitialValues,
  initialWorkReferences,
}: ProfileWizardProps) {
  const [activeStep, setActiveStep] = useState(initialHighestReachableStep);
  const [highestReachableStep, setHighestReachableStep] = useState(initialHighestReachableStep);

  function handleSelectStep(step: number) {
    if (step > highestReachableStep) return;
    setActiveStep(step);
  }

  function handleStep1Continue() {
    setHighestReachableStep((prev) => Math.max(prev, 2));
    setActiveStep(2);
  }

  return (
    <div className="flex flex-col w-full">
      <RegistrationHero
        firstName={firstName}
        lastName={lastName}
        email={email}
        avatarUrl={avatarUrl}
        activeStep={activeStep}
        highestReachableStep={highestReachableStep}
        onSelectStep={handleSelectStep}
      />
      <div className="w-full py-10 px-gutter">
        <div className="max-w-4xl mx-auto">
          {activeStep === 1 && <Step1Form initialValues={step1InitialValues} onContinue={handleStep1Continue} />}
          {activeStep === 2 && (
            <Step2Form initialValues={step2InitialValues} initialWorkReferences={initialWorkReferences} />
          )}
        </div>
      </div>
    </div>
  );
}
