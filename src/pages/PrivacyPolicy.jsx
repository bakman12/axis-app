import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-base">Privacy Policy</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 text-sm text-gray-700 dark:text-gray-300 pb-24">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Axis</h1>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Privacy Policy</h2>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last updated: 6 May 2026</p>
        </div>

        <Section title="1. Introduction">
          <p>Axis is a personal health management application that helps you log medications, receive reminders, and access an AI-powered health coach for recipe and workout suggestions tailored to your conditions. This Privacy Policy explains how Axis handles your personal information.</p>
          <p className="mt-2">We have designed Axis with privacy as a core principle. Your data belongs to you, it stays on your device, and we cannot access it.</p>
        </Section>

        <Section title="2. Who We Are">
          <p>Axis is developed and maintained as an independent application. For any privacy-related enquiries, please contact us at:</p>
          <p className="mt-2 text-blue-600 dark:text-blue-400">privacy@axishealth.app</p>
        </Section>

        <Section title="3. What Data We Collect">
          <p>Axis collects only the information you choose to provide. This may include:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Your name</li>
            <li>Your health conditions</li>
            <li>Your medications and dosage schedules</li>
            <li>Workout and recipe preferences based on your conditions</li>
          </ul>
          <p className="mt-2">We do not collect your email address, date of birth, location, payment information, or any other personal identifiers beyond those listed above.</p>
        </Section>

        <Section title="4. How Your Data Is Stored">
          <p>All data you enter into Axis is stored locally on your device only. This means:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Your data never leaves your device</li>
            <li>We do not operate servers that store your personal information</li>
            <li>We have no ability to access, view, or retrieve your data</li>
            <li>Your data is not backed up to any cloud service by Axis</li>
          </ul>
          <p className="mt-2">Your data is protected using end-to-end encryption (E2EE) and can only be accessed via your device's biometric authentication (fingerprint or face recognition). This means that even if your device were accessed without your permission, your Axis data would remain protected.</p>
        </Section>

        <Section title="5. How We Use Your Data">
          <p>Your data is used solely to provide the features of Axis, including:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Displaying your medication schedule and sending reminders</li>
            <li>Generating personalised recipe and workout suggestions via the AI health coach</li>
            <li>Enabling you to review and manage your health logs</li>
          </ul>
          <p className="mt-2">We do not use your data for advertising, profiling, or any purpose beyond operating the app's features for your benefit.</p>
        </Section>

        <Section title="6. Analytics and Tracking">
          <p>Axis does not collect analytics data, crash reports, usage statistics, or any form of behavioural tracking. We do not use third-party analytics tools. We have no visibility into how you use the app.</p>
        </Section>

        <Section title="7. Third-Party Data Sharing">
          <p>We do not sell, share, rent, or disclose your personal data to any third parties. Your data is never transmitted to external servers, advertisers, or data brokers.</p>
        </Section>

        <Section title="8. Your Rights Under UK GDPR">
          <p>As a UK resident, you have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Right of access</strong> — you can view all data stored within the app at any time</li>
            <li><strong>Right to rectification</strong> — you can edit or correct your information within the app</li>
            <li><strong>Right to erasure</strong> — you can delete your data at any time within the app settings</li>
            <li><strong>Right to data portability</strong> — you can export your data in a readable format using the Export feature in the app</li>
            <li><strong>Right to restrict processing</strong> — as all processing is local, you retain full control at all times</li>
          </ul>
          <p className="mt-2">Because all data is stored locally on your device, you exercise most of these rights directly within the app without needing to contact us. If you have any concerns, please reach out via the contact email above.</p>
        </Section>

        <Section title="9. Data Export and Deletion">
          <p>Axis gives you full control over your data:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Export</strong> — you can export all your data at any time from the app settings. Your data will be provided in a portable format.</li>
            <li><strong>Deletion</strong> — you can permanently delete all your data from within the app. Once deleted, this action cannot be reversed.</li>
          </ul>
          <p className="mt-2">Uninstalling the app from your device will also permanently remove all locally stored data.</p>
        </Section>

        <Section title="10. Screenshot Protection">
          <p>To protect your sensitive health information, Axis prevents screenshots and screen recordings from being taken while the app is in use. This is a security feature designed to stop your medication or health data from being captured without your knowledge.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>Axis is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided personal information through Axis, please contact us and we will take steps to address this.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. Any changes will be reflected by an updated date at the top of this document. We encourage you to review this policy periodically. Continued use of Axis after any changes constitutes your acceptance of the updated policy.</p>
        </Section>

        <Section title="13. Contact Us">
          <p>If you have any questions, concerns, or requests relating to this Privacy Policy or your personal data, please contact us at:</p>
          <p className="mt-2 text-blue-600 dark:text-blue-400">privacy@axishealth.app</p>
          <p className="mt-2">We will respond to all enquiries within a reasonable timeframe.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-semibold text-base text-gray-900 dark:text-white mb-2">{title}</h2>
      {children}
    </section>
  );
}
