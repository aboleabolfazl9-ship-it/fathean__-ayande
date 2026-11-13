import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../../components/ui/Feedback';

export default function NotFound() {
  return (
    <section className="section" style={{ paddingTop: 160 }}>
      <div className="container">
        <EmptyState
          icon={Compass}
          title="صفحه مورد نظر یافت نشد"
          description="نشانی وارد شده در سامانه وجود ندارد. از طریق صفحه اصلی ادامه دهید."
          action={
            <Link className="btn btn-primary" to="/">
              بازگشت به صفحه اصلی
            </Link>
          }
        />
      </div>
    </section>
  );
}
