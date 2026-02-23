import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="px-6 md:px-16 lg:px-36 py-20 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-lg leading-relaxed mb-4">
        At <span className="font-semibold">YadavShow</span>, we respect your privacy. 
        This Privacy Policy explains how we collect, use, and protect your personal data.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>We only collect necessary details like your name, email, and payment information.</li>
        <li>Your data is never shared with third parties without your consent.</li>
        <li>All transactions are secured with Stripe for safe payments.</li>
        <li>You may request deletion of your account and data anytime.</li>
      </ul>
      <p className="mt-6">
        If you have any questions about this Privacy Policy, contact us at:  
        <strong> satyamyadav4848@gmail.com</strong>
      </p>
    </div>
  );
};

export default PrivacyPolicy;
