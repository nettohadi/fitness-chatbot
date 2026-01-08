export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          WhatsApp Calorie Tracker
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Track your daily calorie intake seamlessly via WhatsApp.
          Simply send your meals or calorie counts, and let AI help you monitor your nutrition.
        </p>
        <div className="flex flex-col gap-4 items-center mt-8">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
            <h2 className="text-2xl font-semibold mb-4">How it works</h2>
            <ol className="text-left space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="font-bold text-indigo-600 mr-2">1.</span>
                <span>Send a WhatsApp message to our bot</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-indigo-600 mr-2">2.</span>
                <span>Log calories directly or describe your food</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-indigo-600 mr-2">3.</span>
                <span>AI estimates calories from your description</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-indigo-600 mr-2">4.</span>
                <span>Check your daily and weekly totals anytime</span>
              </li>
            </ol>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            API Status: Ready for deployment
          </p>
        </div>
      </div>
    </div>
  );
}
