import { PageHeader, PageStack } from '@/components/erp/PagePrimitives';
import FeedbackPanel from '@/components/FeedbackPanel';

export default function TeacherFeedback() {
  return (
    <PageStack>
      <PageHeader 
        title="Teacher Feedback" 
        description="View and respond to parent feedback tagged to you"
      />
      <FeedbackPanel role="teacher" />
    </PageStack>
  );
}
