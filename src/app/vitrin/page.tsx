import Link from 'next/link';
import {
  Star, LayoutGrid, ArrowUp, Flame, Type, RefreshCw,
  Zap, ChevronLeft, CheckCircle,
} from 'lucide-react';

const DOPINGS = [
  {
    icon: Star,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    badge: 'الأكثر شعبية',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    title: 'واجهة الصفحة الرئيسية',
    description: 'اجعل إعلانك يظهر في الصفحة الرئيسية التي يزورها ملايين الأشخاص يومياً. عظّم ظهور علامتك التجارية.',
    perks: ['موقع واجهة مميز في الصفحة الرئيسية', 'شارة واجهة ذهبية اللون', 'مزيد من النقرات والمشاهدات'],
  },
  {
    icon: LayoutGrid,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    badge: null,
    badgeColor: '',
    title: 'واجهة الفئة',
    description: 'اجعل إعلانك يُعرض في منطقة الواجهة المميزة للفئة التي ينتمي إليها. صل مباشرةً إلى جمهورك المستهدف.',
    perks: ['موقع واجهة في صفحة الفئة', 'أولوية في بحث الفئة', 'تفوّق على منافسيك في الظهور'],
  },
  {
    icon: ArrowUp,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    badge: null,
    badgeColor: '',
    title: 'في أعلى القائمة',
    description: 'احتل دائماً المرتبة الأولى في قوائم البحث واحصل على أولوية في الظهور. حافظ على ميزة التقدم في كل الأوقات.',
    perks: ['الصدارة في نتائج البحث', 'في المقدمة بغض النظر عن الفلاتر', 'موقع ثابت حتى انتهاء المدة'],
  },
  {
    icon: Flame,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    badge: 'بيع سريع',
    badgeColor: 'bg-red-100 text-red-700',
    title: 'إعلان عاجل',
    description: 'إذا كنت بحاجة للبيع فوراً، أضف شارة عاجل حمراء لافتة للنظر إلى إعلانك. اجذب انتباه المشترين على الفور.',
    perks: ['شارة عاجل حمراء ومتميزة', 'عرض أولوي للمشترين العاجلين', 'أقصى قدر من الاهتمام لبيع أسرع'],
  },
  {
    icon: Type,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    badge: null,
    badgeColor: '',
    title: 'خط عريض وإطار ملون',
    description: 'تميّز على الفور في قوائم البحث بإطار ملون وعنوان بخط عريض. ضمان بصري للظهور المميز بين آلاف الإعلانات.',
    perks: ['إطار برتقالي واضح وجذاب', 'عنوان بخط عريض وكبير', 'تميّز أيضاً في عرض القائمة'],
  },
  {
    icon: RefreshCw,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-500',
    badge: null,
    badgeColor: '',
    title: 'تحديث الإعلان',
    description: 'جدّد تاريخ إعلانك لرفعه إلى أعلى القوائم كأنه نُشر للتو. أعد الحياة إلى إعلاناتك القديمة وزِد فرص البيع.',
    perks: ['صدارة القوائم بإعادة ضبط التاريخ', 'أنعش إعلاناتك القديمة', 'حق الاستخدام مرة واحدة يومياً'],
  },
];

const STATS = [
  { value: '+2.4M', label: 'زائر شهري' },
  { value: '+180K', label: 'إعلان نشط' },
  { value: '3×',   label: 'مبيعات أسرع' },
  { value: '%94',  label: 'نسبة الرضا' },
];

export default function VitrinPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-yellow-300" />
            نظام ترقية إعلانات فرصة
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-5">
            أوصل إعلانك <span className="text-yellow-300">للملايين</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto mb-8 leading-relaxed">
            مع ترقيات فرصة، اجعل إعلانك يتفوق على المنافسين، واصل لعدد أكبر من المشترين، واحصل على نتائج أسرع بكثير.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/account/listings"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold text-base px-8 py-3.5 rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5" />
              اشترِ الترقية الآن
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <Link
              href="/listings"
              className="text-sm text-blue-200 hover:text-white transition-colors font-medium"
            >
              ← تصفح الإعلانات أولاً
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-xs text-blue-200 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Doping options grid ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">6 خيارات قوية للترقية</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            امنح إعلانك رؤية لا مثيل لها مع باقة ترقية تناسب كل ميزانية وهدف.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOPINGS.map((d) => (
            <div
              key={d.title}
              className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-xl transition-all duration-200"
            >
              {d.badge && (
                <span className={`absolute top-4 start-4 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${d.badgeColor}`}>
                  {d.badge}
                </span>
              )}

              <div className={`w-12 h-12 rounded-2xl ${d.iconBg} flex items-center justify-center mb-4`}>
                <d.icon className={`w-6 h-6 ${d.iconColor}`} />
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2">{d.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{d.description}</p>

              <ul className="space-y-1.5">
                {d.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-px" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-10">كيف تعمل؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '١',
                title: 'اختر إعلانك',
                desc: 'اختر إعلانك النشط الذي تريد ترقيته من صفحة "إعلاناتي".',
              },
              {
                step: '٢',
                title: 'اختر الترقية',
                desc: 'اختر باقة الترقية الأنسب لاحتياجاتك وأتمّ عملية الشراء.',
              },
              {
                step: '٣',
                title: 'شاهد النتائج',
                desc: 'تُفعَّل ترقيتك على الفور. مشترون أكثر، وبيع أسرع!',
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-extrabold shadow-md">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 shadow-2xl">
          <Zap className="w-10 h-10 text-yellow-300 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold text-white mb-3">
            ابدأ الآن
          </h2>
          <p className="text-blue-100 text-sm mb-8 leading-relaxed">
            أضف الترقية لإعلانك في ثوانٍ وشاهد الفرق فوراً.
          </p>
          <Link
            href="/account/listings"
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-extrabold text-base px-10 py-4 rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            <Zap className="w-5 h-5" />
            اشترِ الترقية الآن
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <p className="text-blue-200 text-xs mt-5 leading-relaxed max-w-sm mx-auto">
            لشراء الترقية، يجب اختيار أحد إعلاناتك النشطة من صفحة &quot;بما يخصني &gt; إعلاناتي&quot;.
          </p>
        </div>
      </section>

    </div>
  );
}
