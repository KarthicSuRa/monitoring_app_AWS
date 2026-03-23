import EmailItem from './EmailItem';
import { Email } from '../../types';

const EmailsList = ({ emails }: { emails: Email[] }) => {
  return (
    <div className="space-y-4">
      {emails.map((email: Email) => (
        <EmailItem key={email.id} email={email} />
      ))}
    </div>
  );
};

export default EmailsList;
