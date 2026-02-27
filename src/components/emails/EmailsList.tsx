
import EmailItem from './EmailItem';

const EmailsList = ({ emails }) => {
  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <EmailItem key={email.id} email={email} />
      ))}
    </div>
  );
};

export default EmailsList;
