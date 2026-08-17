import React from 'react';

export const AffiliateModule = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-md my-4">
      <h3 className="text-lg font-semibold text-blue-800">Support Our Work</h3>
      <p className="text-sm text-blue-700 mt-2">
        We use <a href="https://vercel.com/?utm_source=affiliate" className="underline font-medium">Vercel</a> for hosting and <a href="https://anthropic.com" className="underline font-medium">Anthropic&apos;s Claude</a> for AI analysis. Try them out today!
      </p>
    </div>
  );
};
