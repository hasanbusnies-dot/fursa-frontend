import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { StaticPage, Section } from '@/components/static/StaticPage';

export const metadata: Metadata = {
  title: 'اتصل بنا',
  description: 'تواصل مع فريق فرصة — استفسارات، دعم، شراكات.',
};

// A contact FORM was deliberately not built: there is no /contact endpoint on the
// API, so a form would either silently discard messages or need a backend change
// first. Direct channels are honest until that exists.

const SUPPORT_EMAIL = 'fursago.app@gmail.com';
const SUPPORT_PHONE = '+90 536 992 7578';
const SUPPORT_PHONE_E164 = '+905369927578'; // tel:/wa.me want no spaces

// `ltr` marks values that are Latin/numeric (email, phone) so they render left-to-right
// inside the RTL page. The Arabic values (address, hours) must NOT be forced to LTR —
// doing so pushes their punctuation to the wrong end.
const CHANNELS = [
  {
    Icon: Mail,
    label: 'البريد الإلكتروني',
    ltr: true,
    value: (
      <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline font-medium">
        {SUPPORT_EMAIL}
      </a>
    ),
    note: 'للاستفسارات العامة والدعم الفني.',
  },
  {
    Icon: Phone,
    label: 'الهاتف / واتساب',
    ltr: true,
    value: (
      <a href={`https://wa.me/${SUPPORT_PHONE_E164.replace('+', '')}`} className="text-blue-600 hover:underline font-medium">
        {SUPPORT_PHONE}
      </a>
    ),
    note: 'واتساب للمساعدة السريعة وطلبات المتاجر.',
  },
  {
    Icon: MapPin,
    label: 'العنوان',
    ltr: false,
    value: <>تركيا / أنقرة</>,
    note: 'مقر الشركة.',
  },
  {
    Icon: Clock,
    label: 'ساعات العمل',
    ltr: false,
    value: <>متاح على مدار الساعة، طوال أيام الأسبوع</>,
    note: 'نردّ في أقرب وقت ممكن.',
  },
];

export default function ContactPage() {
  return (
    <StaticPage
      title="اتصل بنا"
      intro="نسعد بتواصلك معنا — للاستفسارات، الدعم، الإبلاغ عن إعلان، أو الشراكات."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CHANNELS.map(({ Icon, label, value, note, ltr }) => (
          <div key={label} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </span>
              <p className="text-sm font-bold text-gray-800">{label}</p>
            </div>
            <div
              className="text-sm text-gray-700 mb-1"
              dir={ltr ? 'ltr' : undefined}
              style={ltr ? { textAlign: 'start' } : undefined}
            >
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
          — محتوى مضلل، سلعة ممنوعة، أو محاولة احتيال — استخدم زر{' '}
          <strong>«الإبلاغ عن إعلان مخالف»</strong> الموجود في صفحة الإعلان نفسه. اختر سبب
          البلاغ من القائمة، وأضف تفاصيل إن أردت، وسيصل بلاغك إلى فريق المراجعة مباشرةً.
        </p>
        <p>
          يتطلب الإبلاغ تسجيل الدخول، ويمكن الإبلاغ عن الإعلان الواحد مرة واحدة لكل مستخدم.
          إذا تعذّر عليك الوصول إلى الإعلان أو واجهت مشكلة أخرى، راسلنا على بريد الدعم أعلاه.
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
