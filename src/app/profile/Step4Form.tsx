"use client";

import { useState, type FormEvent, type UIEvent } from "react";
import { candidateProfileStep4SubmitSchema } from "@/lib/validation/candidate-profile-step4";

const inputClass =
  "w-full h-10 px-3 bg-surface-container-low text-candidate-text-heading rounded-lg text-body-md focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all";
const disabledInputClass =
  "w-full h-10 px-3 bg-surface-container-low text-candidate-secondary rounded-lg text-body-md cursor-not-allowed";
const labelClass = "block text-label-md text-candidate-text-heading mb-1";
const cardClass = "bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-md space-y-5";
const errorTextClass = "text-label-sm text-error mt-1";

// Scroll-to-bottom tolerance in px — accounts for sub-pixel rounding across browsers/zoom levels.
const SCROLL_END_THRESHOLD = 8;

interface DeclarationSection {
  heading: string;
  paragraphs?: string[];
  bulletIntro?: string;
  bullets?: string[];
  bulletOutro?: string;
}

// Reproduced verbatim from the Employee Declaration document supplied by the
// client — do not paraphrase, reword, or omit any section.
const DECLARATION_SECTIONS: DeclarationSection[] = [
  {
    heading: "1. PURPOSE OF THIS DECLARATION",
    paragraphs: [
      "This Employee Declaration confirms that I have received, or have been provided with access to, the information and documentation relevant to my employment and/or assignment with Huge Recruitment.",
      "I understand that I am responsible for familiarising myself with the requirements that apply to my role and for following the instructions, procedures and workplace standards relevant to my employment and assignment.",
      "I understand that this declaration should be read together with my applicable contractual documents, Key Information Document, Assignment Details and Huge Recruitment policies and procedures.",
    ],
  },
  {
    heading: "2. INFORMATION AND COMPANY DOCUMENTS",
    paragraphs: ["I confirm that Huge Recruitment has provided me with, or made available to me, the information relevant to my employment and assignment."],
    bulletIntro: "This may include:",
    bullets: [
      "Terms of Engagement or other contractual documentation;",
      "Key Information Document, where applicable;",
      "Assignment Details;",
      "Health and Safety information;",
      "Company policies and procedures;",
      "Holiday and absence arrangements;",
      "Pay and timesheet information;",
      "Equality and workplace conduct requirements;",
      "Data protection and privacy information; and",
      "any additional information relevant to my particular assignment.",
    ],
    bulletOutro: "I understand that I should ask Huge Recruitment if I require clarification about any document or requirement.",
  },
  {
    heading: "3. UNDERSTANDING OF MY ASSIGNMENT",
    paragraphs: ["I confirm that I have been given information about the work I am expected to undertake."],
    bulletIntro: "Depending on the assignment, this information may include:",
    bullets: [
      "the workplace and reporting arrangements;",
      "my job duties and responsibilities;",
      "working hours and shift arrangements;",
      "expected start date and assignment duration;",
      "pay arrangements;",
      "required qualifications or experience;",
      "training requirements;",
      "health and safety requirements;",
      "personal protective equipment;",
      "workplace rules; and",
      "any known risks associated with the role.",
    ],
    bulletOutro: "I understand that assignment requirements may vary depending on the needs of the client and the nature of the work.",
  },
  {
    heading: "4. WORKING HOURS, BREAKS AND REST",
    paragraphs: [
      "I understand that my working hours, breaks and rest arrangements must comply with the requirements applicable to my employment and assignment.",
      "I agree to record my working hours accurately and to follow the relevant timesheet and attendance procedures.",
      "I will raise any concern regarding working hours, rest periods or breaks with Huge Recruitment as soon as reasonably practicable.",
      "I understand that I must not work additional hours unless properly authorised.",
    ],
  },
  {
    heading: "5. HOLIDAY AND ANNUAL LEAVE",
    paragraphs: [
      "I understand that I am entitled to applicable paid annual leave in accordance with the terms applying to my employment and relevant legislation.",
      "I understand that holiday should be requested using the Huge Recruitment holiday procedure and that I should provide appropriate notice when requesting leave.",
      "I acknowledge that holiday arrangements may be affected by the operational requirements of my assignment, subject to applicable legal requirements.",
    ],
  },
  {
    heading: "6. ATTENDANCE AND ABSENCE",
    paragraphs: ["I understand that reliable attendance and punctuality are important requirements of my role."],
    bulletIntro: "I agree to:",
    bullets: [
      "attend work at the agreed time;",
      "be ready to begin work at the required start time;",
      "follow the correct absence-reporting procedure;",
      "notify Huge Recruitment promptly if I cannot attend work;",
      "provide information or evidence where reasonably required; and",
      "keep Huge Recruitment informed of any circumstances that may affect my attendance.",
    ],
    bulletOutro: "I understand that unauthorised absence or repeated lateness may be dealt with under the appropriate Company procedure.",
  },
  {
    heading: "7. HEALTH, SAFETY AND WELFARE",
    paragraphs: ["I understand that I have a responsibility to work safely and to follow the health and safety requirements applicable to my workplace."],
    bulletIntro: "I agree to:",
    bullets: [
      "follow safety instructions;",
      "attend required health and safety training;",
      "use equipment correctly;",
      "wear required PPE;",
      "report hazards and unsafe conditions;",
      "report accidents, injuries and near misses;",
      "follow site-specific safety procedures; and",
      "only undertake work for which I have received the necessary instruction or training.",
    ],
    bulletOutro: "I understand that I must raise any serious health or safety concern with the appropriate person without unnecessary delay.",
  },
  {
    heading: "8. PERSONAL PROTECTIVE EQUIPMENT",
    paragraphs: [
      "Where PPE is required for my assignment, I understand that I must use it correctly and in accordance with the instructions provided.",
      "This may include safety footwear, high-visibility clothing, gloves, eye protection, hearing protection or other protective equipment depending on the work involved.",
      "I will report damaged, defective, missing or unsuitable PPE before undertaking work that requires its use.",
    ],
  },
  {
    heading: "9. MACHINERY, VEHICLES AND EQUIPMENT",
    paragraphs: [
      "I understand that I must not operate machinery, vehicles or other workplace equipment unless I have received the appropriate training, authorisation or instruction.",
      "I will follow the relevant operating and safety procedures and will report defective or unsafe equipment immediately.",
      "I will not deliberately interfere with, remove or bypass safety equipment or protective systems.",
    ],
  },
  {
    heading: "10. DRUGS, ALCOHOL AND FITNESS FOR WORK",
    paragraphs: [
      "I understand that I must be fit and capable of carrying out my duties safely.",
      "I must not attend work while impaired by alcohol, illegal drugs or any other substance that could affect my ability to work safely.",
      "I understand that relevant Huge Recruitment and client procedures relating to drugs, alcohol and fitness for work apply to my employment and assignment.",
    ],
  },
  {
    heading: "11. EQUALITY, DIGNITY AND RESPECT",
    paragraphs: [
      "I understand that Huge Recruitment expects everyone to be treated fairly, professionally and with respect.",
      "I agree not to engage in bullying, harassment, victimisation, intimidation or unlawful discrimination.",
      "I will treat colleagues, supervisors, managers, clients and other individuals respectfully, regardless of their background or personal characteristics.",
      "I understand that concerns about inappropriate behaviour should be raised through the appropriate reporting procedure.",
    ],
  },
  {
    heading: "12. CONFIDENTIALITY",
    paragraphs: [
      "I understand that I may have access to confidential information belonging to Huge Recruitment, its clients or other individuals during my employment or assignment.",
      "I agree not to disclose, copy, misuse or share confidential information unless I am authorised to do so.",
      "I understand that confidentiality obligations may continue after my employment or assignment ends where information remains confidential.",
    ],
  },
  {
    heading: "13. PERSONAL INFORMATION AND DATA PROTECTION",
    paragraphs: [
      "I understand that Huge Recruitment needs to collect and use personal information for purposes connected with my employment, recruitment, work allocation, payroll, administration, legal obligations and other legitimate business purposes.",
      "I understand that personal information will be handled in accordance with applicable data protection requirements and Huge Recruitment's privacy information.",
      "I agree to notify Huge Recruitment when relevant personal information changes, including my contact details, bank details or other information required for the administration of my employment.",
    ],
  },
  {
    heading: "14. QUALIFICATIONS, TRAINING AND EXPERIENCE",
    paragraphs: [
      "I confirm that the information I have provided concerning my qualifications, licences, training, experience and employment history is accurate to the best of my knowledge.",
      "I understand that certain assignments may require specific qualifications, licences or training.",
      "I will not carry out work requiring a particular qualification or authorisation unless I hold the relevant valid qualification or authorisation.",
      "I will inform Huge Recruitment if a relevant qualification, licence or authorisation expires, is suspended, restricted or withdrawn.",
    ],
  },
  {
    heading: "15. RIGHT TO WORK AND EMPLOYEE INFORMATION",
    paragraphs: [
      "I confirm that I have provided the information and documentation required by Huge Recruitment to establish my eligibility to work in the United Kingdom.",
      "I understand that I must notify Huge Recruitment promptly if there is any change affecting my right or permission to work.",
    ],
    bulletIntro: "I will also inform Huge Recruitment of changes to important personal information, including:",
    bullets: ["home address;", "telephone number;", "email address;", "bank details;", "emergency contact details; and", "other information relevant to my employment."],
  },
  {
    heading: "16. COMPANY AND CLIENT PROPERTY",
    paragraphs: [
      "I agree to take reasonable care of any property, equipment, clothing, identification, access cards, documents or other items belonging to Huge Recruitment or its clients.",
      "I understand that Company or client property must be returned when requested or when my employment or assignment ends.",
    ],
  },
  {
    heading: "17. COMPANY POLICIES AND PROCEDURES",
    paragraphs: ["I understand that I am required to comply with the policies and procedures applicable to my employment and assignment."],
    bulletIntro: "These may include policies covering:",
    bullets: [
      "Health and Safety;",
      "Equality, Diversity and Inclusion;",
      "Data Protection;",
      "Drugs and Alcohol;",
      "Holiday;",
      "Sickness and Absence;",
      "Conduct;",
      "Disciplinary matters;",
      "Grievance;",
      "Confidentiality;",
      "PPE;",
      "Accident and Incident Reporting; and",
      "other workplace requirements relevant to my role.",
    ],
    bulletOutro: "I understand that policies and procedures may be reviewed and updated from time to time.",
  },
  {
    heading: "18. RAISING QUESTIONS OR CONCERNS",
    paragraphs: [
      "I understand that I can contact Huge Recruitment if I do not understand any information provided to me or if I have a concern about my employment or assignment.",
      "I understand that concerns relating to health and safety, harassment, discrimination, pay, working conditions, conduct or other workplace matters should be raised through the appropriate channel.",
      "I confirm that I have been given an opportunity to ask questions about the information provided to me.",
    ],
  },
];

const EMPLOYEE_CONFIRMATION_ITEMS = [
  "I have received, or have been given access to, the information and documents relevant to my employment and assignment.",
  "I have had a reasonable opportunity to read and consider the information provided.",
  "I understand the responsibilities and standards expected of me.",
  "I understand the requirements relating to attendance, working hours, health and safety and workplace conduct.",
  "I understand that additional requirements may apply to individual assignments.",
  "I understand that I should ask Huge Recruitment if I require further explanation or clarification.",
  "I confirm that the information I have provided to Huge Recruitment is accurate and complete to the best of my knowledge.",
  "I agree to follow the applicable Huge Recruitment policies, procedures and reasonable workplace instructions.",
  "I understand that this declaration should be read alongside my contractual documents and assignment information.",
  "I understand that this declaration does not remove or reduce any statutory rights or protections that apply to me.",
];

const SIGN_OFF_PARAGRAPHS = [
  "I confirm that I have read this Employee Declaration and understand the responsibilities and requirements explained in it.",
  "I confirm that I have had the opportunity to ask questions and obtain clarification where necessary.",
  "I understand that I am expected to comply with the requirements applicable to my employment and assignment with Huge Recruitment.",
];

export interface Step4InitialValues {
  declarationFullName: string | null;
  declarationAcceptedAt: string | null;
}

interface Step4FormProps {
  initialValues: Step4InitialValues | null;
  onSubmitted: () => void;
  onAvatarMissing: () => void;
  readOnly?: boolean;
  onLockedInteraction?: () => void;
}

async function saveDeclaration(declarationFullName: string) {
  const response = await fetch("/api/candidate/profile/step-4", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: "submit", declarationFullName, declarationAccepted: true }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

export function Step4Form({
  initialValues,
  onSubmitted,
  onAvatarMissing,
  readOnly = false,
  onLockedInteraction,
}: Step4FormProps) {
  const [declarationFullName, setDeclarationFullName] = useState(initialValues?.declarationFullName ?? "");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  // Already-submitted (readOnly) profiles reopen the wizard with the text already "read".
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(readOnly);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  function handleDeclarationScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_END_THRESHOLD) {
      setHasScrolledToEnd(true);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNameError(null);

    const parsed = candidateProfileStep4SubmitSchema.safeParse({
      intent: "submit",
      declarationFullName,
      declarationAccepted,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "declarationFullName") setNameError(issue.message);
        if (issue.path[0] === "declarationAccepted") setError(issue.message);
      }
      return;
    }

    setSubmitting(true);
    try {
      const { ok, data } = await saveDeclaration(declarationFullName);
      if (!ok) {
        if (data.field === "avatar") {
          onAvatarMissing();
        }
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="text-label-md text-error bg-error-container text-on-error-container rounded-lg px-4 py-3"
        >
          {error}
        </p>
      )}

      <div className="relative">
        {readOnly && (
          <div className="absolute inset-0 z-10 cursor-not-allowed" onClick={onLockedInteraction} role="presentation" />
        )}
        <fieldset disabled={readOnly} className="contents space-y-6">
          <div className={cardClass}>
            <div>
              <h2 className="text-headline-md text-candidate-text-heading">Employee Declaration</h2>
              <p className="text-label-sm text-candidate-secondary mt-0.5">
                Please read the declaration below in full. Scroll to the end to enable the confirmation checkbox.
              </p>
            </div>

            <div
              onScroll={handleDeclarationScroll}
              className="max-h-[28rem] overflow-y-auto rounded-xl border border-surface-container-high bg-surface-container-low p-4 sm:p-5 space-y-5 text-body-md text-candidate-text-heading"
            >
              <div className="text-center space-y-1 pb-2 border-b border-surface-container-high">
                <p className="text-label-sm font-bold uppercase tracking-wider text-candidate-secondary">Huge Recruitment</p>
                <h3 className="text-headline-sm text-candidate-text-heading">Employee Declaration</h3>
              </div>

              {DECLARATION_SECTIONS.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h4 className="text-label-md font-bold uppercase tracking-wider text-candidate-text-heading">
                    {section.heading}
                  </h4>
                  {section.paragraphs?.map((paragraph, index) => (
                    <p key={index} className="text-body-sm">
                      {paragraph}
                    </p>
                  ))}
                  {section.bulletIntro && <p className="text-body-sm">{section.bulletIntro}</p>}
                  {section.bullets && (
                    <ul className="list-disc pl-5 space-y-1 text-body-sm">
                      {section.bullets.map((bullet, index) => (
                        <li key={index}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                  {section.bulletOutro && <p className="text-body-sm">{section.bulletOutro}</p>}
                </section>
              ))}

              <section className="space-y-2">
                <h4 className="text-label-md font-bold uppercase tracking-wider text-candidate-text-heading">
                  19. EMPLOYEE CONFIRMATION
                </h4>
                <p className="text-body-sm">By signing this declaration, I confirm that:</p>
                <ol className="list-decimal pl-5 space-y-1 text-body-sm">
                  {EMPLOYEE_CONFIRMATION_ITEMS.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ol>
              </section>

              <section className="space-y-2 pt-2 border-t border-surface-container-high">
                <h4 className="text-label-md font-bold uppercase tracking-wider text-candidate-text-heading">
                  Employee Declaration
                </h4>
                {SIGN_OFF_PARAGRAPHS.map((paragraph, index) => (
                  <p key={index} className="text-body-sm">
                    {paragraph}
                  </p>
                ))}
              </section>
            </div>
          </div>

          <div className={cardClass}>
            <label className="flex items-start gap-3 cursor-pointer has-[:disabled]:cursor-not-allowed">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={declarationAccepted}
                disabled={!hasScrolledToEnd}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
              />
              <span className="text-body-sm text-candidate-text-heading">
                I confirm that I have read this Employee Declaration and understand the responsibilities and
                requirements explained in it. I confirm that I have had the opportunity to ask questions and obtain
                clarification where necessary.
              </span>
            </label>
            {!hasScrolledToEnd && (
              <p className="text-label-sm text-candidate-secondary">Scroll to the end of the declaration above to enable this checkbox.</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="declaration-full-name">
                  Full Name <span className="text-error">*</span>
                </label>
                <input
                  id="declaration-full-name"
                  className={inputClass}
                  placeholder="e.g. James Baldwin"
                  value={declarationFullName}
                  onChange={(e) => setDeclarationFullName(e.target.value)}
                />
                <p className="text-label-sm text-candidate-secondary mt-1">Typing your name here serves as your signature.</p>
                {nameError && (
                  <p role="alert" aria-live="assertive" className={errorTextClass}>
                    {nameError}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="declaration-date">
                  Date
                </label>
                <input id="declaration-date" className={disabledInputClass} value={today} disabled readOnly />
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !declarationAccepted}
            className="w-full sm:w-auto h-11 px-7 rounded-lg bg-candidate-navy-dark hover:bg-candidate-secondary text-white text-label-md font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Save & Submit"}
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              check_circle
            </span>
          </button>
        </div>
      )}
    </form>
  );
}
