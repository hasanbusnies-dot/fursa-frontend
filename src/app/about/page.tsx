import type { Metadata } from 'next';
import { StaticPage, Section, List, Placeholder } from '@/components/static/StaticPage';

export const metadata: Metadata = {
  title: 'من نحن',
  description: 'تعرّف على فرصة — منصة الإعلانات المبوبة في سوريا.',
};

// FOUNDER: the sections marked with <Placeholder> need your real details —
// the founding story, the mission wording, and the numbers. Everything else is
// factual about how the platform works today and can stay as-is.

export default function AboutPage() {
  return (
    <StaticPage
      title="من نحن"
      intro="فرصة — منصة الإعلانات المبوبة التي تجمع البائعين والمشترين في سوريا."
    >
      <Section title="ما هي فرصة؟">
        <p>
          فرصة منصة إعلانات مبوبة سورية تتيح لك بيع وشراء كل شيء — من العقارات والمركبات
          إلى الأجهزة والمفروشات والخدمات وسوق المستعمَل — في مكان واحد، بواجهة عربية
          بسيطة تعمل على الهاتف والحاسب.
        </p>
        <p>
          هدفنا أن يكون العثور على ما تبحث عنه، أو الوصول إلى مشترٍ جاد لما تبيعه، أمراً
          سهلاً وآمناً وقريباً منك جغرافياً.
        </p>
      </Section>

      <Section title="قصتنا">
        <p>
          <Placeholder>يملأ المؤسس: قصة التأسيس — متى بدأت الفكرة، ولماذا، وما المشكلة التي لاحظتموها في السوق السوري</Placeholder>
        </p>
      </Section>

      <Section title="رسالتنا">
        <p>
          <Placeholder>يملأ المؤسس: صياغة الرسالة والقيم بالتفصيل</Placeholder>
        </p>
      </Section>

      <Section title="ما الذي يميّزنا">
        <List
          items={[
            <>
              <strong>متاجر موثّقة:</strong> حسابات الأعمال تمرّ بمراجعة من فريقنا قبل
              تفعيلها، وتحصل المتاجر المشتركة على شارة توثيق تظهر للمشترين.
            </>,
            <>
              <strong>شبكة مندوبين ميدانيين:</strong> فريق ميداني يسجّل المتاجر ويتابعها
              على الأرض، ويقدّم الدعم للتجار في محافظاتهم.
            </>,
            <>
              <strong>تغطية محلية:</strong> بحث حسب المحافظة والمنطقة والحي، مع إمكانية
              تحديد موقع الإعلان على الخريطة.
            </>,
            <>
              <strong>فئات مفصّلة:</strong> شجرة فئات دقيقة مع فلاتر مخصصة لكل قسم، حتى
              تصل إلى ما تريده بأقل عدد من الخطوات.
            </>,
          ]}
        />
      </Section>

      <Section title="فرصة بالأرقام">
        <p>
          <Placeholder>يملأ المؤسس: عدد الإعلانات، المستخدمين، المتاجر، المحافظات المغطاة</Placeholder>
        </p>
      </Section>

      <Section title="تواصل معنا">
        <p>
          لأي استفسار أو اقتراح أو شراكة، يسعدنا سماعك عبر صفحة{' '}
          <a href="/contact" className="text-blue-600 hover:underline font-medium">اتصل بنا</a>.
        </p>
      </Section>
    </StaticPage>
  );
}
