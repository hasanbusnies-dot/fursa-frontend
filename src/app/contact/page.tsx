import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { StaticPage, Section, Placeholder } from '@/components/static/StaticPage';

export const metadata: Metadata = {
  title: 'اتصل بنا',
  description: 'تواصل مع فريق فرصة — استفسارات، دعم، شراكات.',
};

// FOUNDER: every <Placeholder> below needs a real value. Replace the placeholder
// element with plain text (e.g. support@fursago.com) and it renders normally.
//
// A contact FORM was deliberately not built: there is no /contact endpoint on the
// API, so a form would either silently discard messages or need a backend change
// first. Direct channels are honest until that exists.

const CHANNELS = [
  {
    Icon: Mail,
    label: 'البريد الإلكتروني',
    value: <Placeholder>يملأ المؤسس: بريد الدعم</Placeholder>,
    note: 'للاستفسارات العامة والدعم الفني.',
  },
  {
    Icon: Phone,
    label: 'الهاتف / واتساب',
    value: <Placeholder>يملأ المؤسس: رقم التواصل</Placeholder>,
    note: 'للمساعدة السريعة وطلبات المتاجر.',
  },
  {
    Icon: MapPin,
    label: 'العنوان',
    value: <Placeholder>يملأ المؤسس: العنوان الفعلي إن وُجد</Placeholder>,
    note: 'مقر الشركة.',
  },
  {
    Icon: Clock,
    label: 'ساعات العمل',
    value: <Placeholder>يملأ المؤسس: أيام وساعات الدوام</Placeholder>,
    note: 'نردّ عادةً خلال يوم عمل واحد.',
  },
];

export default function ContactPage() {
  return (
    <StaticPage
      title="اتصل بنا"
      intro="نسعد بتواصلك معنا — للاستفسارات، الدعم، الإبلاغ عن إعلان، أو الشراكات."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map(({ Icon, label, value, note }) => (
          <div key={label} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </span>
              <p className="text-sm font-bold text-gray-800">{label}</p>
            </div>
            <div className="text-sm text-gray-700 mb-1" dir="ltr" style={{ textAlign: 'start' }}>
              {value}
            </div>
            <p className="text-xs text-gray-400">{note}</p>
          </div>
        ))}
      </div>

      <Section title="الإبلاغ عن إعلان مخالف">
        <p>
          إذا صادفت إعلاناً يخالف{' '}
          <a href="/terms" className="text-blue-600 hover:underline font-medium">شروط الخدمة</a>{' '}
          — محتوى مضلل، سلعة ممنوعة، أو محاولة احتيال — راسلنا على بريد الدعم أعلاه مع
          رابط الإعلان ووصف المشكلة، وسيراجعه فريقنا.
        </p>
      </Section>

      <Section title="لأصحاب المتاجر">
        <p>
          يمكنك تسجيل نشاطك التجاري مباشرةً عبر{' '}
          <a href="/register" className="text-blue-600 hover:underline font-medium">إنشاء حساب أعمال</a>،
          ويقوم فريقنا بمراجعة الطلب قبل التفعيل. للاستفسار عن الاشتراكات أو زيارة مندوب
          ميداني لمنطقتك، تواصل معنا عبر القنوات أعلاه.
        </p>
      </Section>

      <Section title="الرسائل داخل المنصة">
        <p className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
          <span>
            للتواصل بشأن إعلان محدد، استخدم زر المراسلة في صفحة الإعلان — فذلك يصل إلى
            البائع مباشرةً ويكون أسرع من مراسلة الدعم.
          </span>
        </p>
      </Section>
    </StaticPage>
  );
}
