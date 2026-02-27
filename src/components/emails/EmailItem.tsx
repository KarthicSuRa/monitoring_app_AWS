
const EmailItem = ({ email }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">{email.subject}</h2>
        <span className="text-sm text-gray-500">{new Date(email.received_at).toLocaleString()}</span>
      </div>
      <p className="text-gray-700">From: {email.sender}</p>
      <div className="mt-2 p-2 bg-gray-100 rounded" dangerouslySetInnerHTML={{ __html: email.message }} />
    </div>
  );
};

export default EmailItem;
