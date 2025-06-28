import React from 'react';

interface DeepResearchReportProps {
  result: any;
}

export const DeepResearchReport: React.FC<DeepResearchReportProps> = ({ result }) => {
  if (!result || !result.output) {
    return <div className="p-4 text-red-500">Invalid report data.</div>;
  }

  const finalReport = result.output.find((item: any) => item.type === 'final_report');
  const reasoningSteps = result.output.filter((item: any) => item.type === 'reasoning');
  const searchCalls = result.output.filter((item: any) => item.type === 'web_search_call');

  if (!finalReport) {
    return <div className="p-4">No final report found.</div>;
  }

  const { content, annotations } = finalReport;
  const reportText = content[0]?.text || '';

  return (
    <div className="p-4 my-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Deep Research Report</h2>
      
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: reportText.replace(/\n/g, '<br />') }} />

      {annotations && annotations.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Sources</h3>
          <ul className="list-disc list-inside text-sm">
            {annotations.map((anno: any, index: number) => (
              <li key={index}>
                <a href={anno.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {anno.title || anno.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-semibold mb-2">Reasoning Process</h3>
        {reasoningSteps.map((step: any, index: number) => (
          <div key={index} className="p-2 my-1 bg-white rounded border">
            <p className="text-xs text-gray-600">{step.summary[0]?.text}</p>
          </div>
        ))}
        {searchCalls.map((call: any, index: number) => (
           <div key={index} className="p-2 my-1 bg-white rounded border">
            <p className="text-xs text-gray-600"><b>Search:</b> {call.action?.query}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
