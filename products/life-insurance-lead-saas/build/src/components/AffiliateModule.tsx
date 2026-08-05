import React from 'react';

export const AffiliateModule = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl my-4 text-center">
      <h3 className="text-lg font-semibold text-blue-900">Partner Tools We Recommend</h3>
      <p className="text-sm text-blue-800 mt-2">
        Manage your leads better with our recommended CRM tools: <a href="https://gohighlevel.com/?utm_source=affiliate" className="underline font-bold hover:text-blue-600">GoHighLevel</a> for automation and <a href="https://vercel.com/?utm_source=affiliate" className="underline font-bold hover:text-blue-600">Vercel</a> for your agency website.
      </p>
    </div>
  );
};
