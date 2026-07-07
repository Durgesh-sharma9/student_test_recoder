import { PageHeader, PageStack } from '@/components/erp/PagePrimitives';
import FeedbackPanel from '@/components/FeedbackPanel';

export default function ParentFeedback() {
  return (
    <PageStack>
      <PageHeader 
        title="Parent Feedback" 
        description="Submit feedback to school administration and track your tickets"
      />
      <FeedbackPanel role="parent" />
    </PageStack>
  );
}
