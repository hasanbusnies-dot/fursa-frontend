'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2, Trash2, Megaphone, Plus, ImageOff,
  ToggleLeft, ToggleRight, UploadCloud, X, CheckCircle2, Film,
  Pencil, Type, Palette,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api, ApiError } from '@/services/api';
import { advertisementsService } from '@/services/advertisements.service';
import type { CreateAdPayload } from '@/services/advertisements.service';
import type { Advertisement, ApiResponse } from '@/types';
import { AdminNav } from '@/components/admin/AdminNav';
import { resolveMediaUrl } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const BG_PRESETS = [
  { label: 'Gece Mavisi',     value: 'linear-gradient(135deg,#1e3a5f,#2563eb)' },
  { label: 'Turuncu Ateş',    value: 'linear-gradient(135deg,#f97316,#ea580c)' },
  { label: 'Mor Rüya',        value: 'linear-gradient(135deg,#7c3aed,#4f46e5)' },
  { label: 'Orman Yeşili',    value: 'linear-gradient(135deg,#065f46,#10b981)' },
  { label: 'Kırmızı Güç',     value: 'linear-gradient(135deg,#991b1b,#ef4444)' },
  { label: 'Obsidyen',        value: '#111827' },
  { label: 'Altın Sarısı',    value: 'linear-gradient(135deg,#b45309,#f59e0b)' },
  { label: 'Pembe Gün Batımı', value: 'linear-gradient(135deg,#be185d,#f472b6)' },
];

const TEXT_COLORS = [
  { label: 'Beyaz',     value: '#ffffff' },
  { label: 'Sarı',      value: '#fde68a' },
  { label: 'Açık Mavi', value: '#bfdbfe' },
  { label: 'Turuncu',   value: '#fed7aa' },
  { label: 'Pembe',     value: '#fbcfe8' },
  { label: 'Siyah',     value: '#111827' },
];

const FONT_SIZES = [
  { label: 'Küçük',     value: '1.25rem'  },
  { label: 'Orta',      value: '1.875rem' },
  { label: 'Büyük',     value: '3rem'     },
  { label: 'Çok Büyük', value: '4.5rem'   },
];

const EMPTY: CreateAdPayload = {
  companyName: '',
  mediaUrl: '',
  mediaType: 'IMAGE',
  targetUrl: '',
  isActive: true,
  adText: '',
  backgroundColor: BG_PRESETS[0].value,
  textColor: '#ffffff',
  fontSize: '1.875rem',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; url: string; previewUrl: string; name: string }
  | { status: 'error'; message: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferMediaType(file: File): CreateAdPayload['mediaType'] {
  if (file.type === 'image/gif') return 'GIF';
  if (file.type.startsWith('video/')) return 'VIDEO';
  return 'IMAGE';
}

function initUploadStateFromAd(ad: Advertisement): UploadState {
  if (ad.mediaType === 'TEXT' || !ad.mediaUrl) return { status: 'idle' };
  return {
    status: 'done',
    url: ad.mediaUrl,
    previewUrl: resolveMediaUrl(ad.mediaUrl),
    name: 'Mevcut dosya',
  };
}

async function uploadFile(
  file: File,
  onState: (s: UploadState) => void,
  onUrl: (url: string, type: CreateAdPayload['mediaType']) => void,
) {
  const mediaType = inferMediaType(file);
  onState({ status: 'uploading' });
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.uploadForm<ApiResponse<{ url: string } | { urls: string[] }>>(
      '/admin/upload', fd,
    );
    const url = 'url' in res.data
      ? res.data.url
      : (res.data as { urls: string[] }).urls[0] ?? '';
    if (!url) throw new Error('Sunucu URL döndürmedi.');
    onState({ status: 'done', url, previewUrl: resolveMediaUrl(url), name: file.name });
    onUrl(url, mediaType);
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : 'Yükleme başarısız oldu.';
    onState({ status: 'error', message: msg });
    toast.error(msg);
  }
}

// ── MediaUploader ─────────────────────────────────────────────────────────────

function MediaUploader({
  uploadState,
  onChange,
  onClear,
}: {
  uploadState: UploadState;
  onChange: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onChange(file);
  }

  if (uploadState.status === 'done') {
    const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(uploadState.url);
    return (
      <div className="relative rounded-xl border-2 border-green-300 bg-green-50 overflow-hidden">
        <div className="flex items-start gap-3 p-3">
          <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
            {isVideo
              ? <video src={uploadState.previewUrl} muted className="w-full h-full object-cover" />
              : <img src={uploadState.previewUrl} alt="preview" className="w-full h-full object-cover" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Yüklendi
            </div>
            <p className="text-xs text-gray-600 truncate">{uploadState.name}</p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{uploadState.url}</p>
          </div>
          <button type="button" onClick={onClear} className="p-1 rounded-full hover:bg-green-200 text-green-600 transition-colors shrink-0" aria-label="Kaldır">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full py-1.5 text-[11px] text-green-700 hover:text-green-900 font-medium transition-colors border-t border-green-200 bg-green-50 hover:bg-green-100">
          Farklı dosya seç
        </button>
        <input ref={inputRef} type="file" accept="image/*,image/gif,video/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  if (uploadState.status === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 py-8 px-4">
        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-blue-600">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer py-8 px-4 transition-colors select-none ${
        dragging ? 'border-blue-400 bg-blue-50'
        : uploadState.status === 'error' ? 'border-red-300 bg-red-50 hover:bg-red-100'
        : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${uploadState.status === 'error' ? 'bg-red-100' : 'bg-white shadow-sm border border-gray-200'}`}>
        {uploadState.status === 'error' ? <X className="w-5 h-5 text-red-500" />
          : dragging ? <UploadCloud className="w-5 h-5 text-blue-500" />
          : <Film className="w-5 h-5 text-gray-400" />}
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold ${uploadState.status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
          {uploadState.status === 'error' ? uploadState.message : dragging ? 'Bırak!' : 'Bilgisayardan Yükle'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Resim, GIF veya Video — sürükle-bırak veya tıkla</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*,image/gif,video/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

// ── TextDesignStudio ──────────────────────────────────────────────────────────

function TextDesignStudio({
  form,
  onChange,
}: {
  form: CreateAdPayload;
  onChange: (patch: Partial<CreateAdPayload>) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <p className="text-xs font-bold text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5" /> Tasarım Stüdyosu
      </p>

      {/* Ad text */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
          <Type className="w-3.5 h-3.5" /> Reklam Yazısı
        </label>
        <textarea
          value={form.adText ?? ''}
          onChange={(e) => onChange({ adText: e.target.value })}
          rows={3}
          placeholder="Reklam metninizi buraya yazın…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none bg-white transition"
        />
      </div>

      {/* Background presets */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Arka Plan</label>
        <div className="grid grid-cols-4 gap-2">
          {BG_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ backgroundColor: p.value })}
              title={p.label}
              className={`h-10 rounded-lg transition-all ${
                form.backgroundColor === p.value
                  ? 'ring-2 ring-offset-1 ring-violet-500 scale-105'
                  : 'hover:scale-105 opacity-80 hover:opacity-100'
              }`}
              style={{ background: p.value }}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 italic">
          {BG_PRESETS.find((p) => p.value === form.backgroundColor)?.label ?? 'Özel'}
        </p>
      </div>

      {/* Text color swatches + custom picker */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Yazı Rengi</label>
        <div className="flex items-center gap-2 flex-wrap">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ textColor: c.value })}
              title={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                form.textColor === c.value
                  ? 'border-violet-500 scale-110 shadow-md'
                  : 'border-gray-300 hover:scale-105'
              }`}
              style={{ background: c.value }}
            />
          ))}
          <label className="flex items-center gap-1 cursor-pointer" title="Özel renk">
            <input
              type="color"
              value={form.textColor ?? '#ffffff'}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="w-7 h-7 rounded-full border-2 border-gray-300 cursor-pointer p-0"
            />
            <span className="text-[10px] text-gray-500">Özel</span>
          </label>
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Yazı Boyutu</label>
        <div className="flex gap-2 flex-wrap">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ fontSize: s.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.fontSize === s.value
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Canlı Önizleme</p>
        <div
          className="w-full h-36 rounded-xl flex items-center justify-center p-6 shadow-inner overflow-hidden"
          style={{ background: form.backgroundColor ?? BG_PRESETS[0].value }}
        >
          <p
            className="font-extrabold text-center leading-tight drop-shadow"
            style={{
              color: form.textColor ?? '#ffffff',
              fontSize: form.fontSize ?? '1.875rem',
            }}
          >
            {form.adText || 'Reklam yazınız burada görünecek…'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  ad,
  onClose,
  onSave,
}: {
  ad: Advertisement;
  onClose: () => void;
  onSave: (updated: Advertisement) => void;
}) {
  const [form, setForm] = useState<CreateAdPayload>({
    companyName:     ad.companyName,
    mediaUrl:        ad.mediaUrl,
    mediaType:       ad.mediaType,
    targetUrl:       ad.targetUrl,
    isActive:        ad.isActive,
    adText:          ad.adText          ?? '',
    backgroundColor: ad.backgroundColor ?? BG_PRESETS[0].value,
    textColor:       ad.textColor       ?? '#ffffff',
    fontSize:        ad.fontSize        ?? '1.875rem',
  });
  const [uploadState, setUploadState] = useState<UploadState>(() => initUploadStateFromAd(ad));
  const [saving, setSaving] = useState(false);

  function patch(p: Partial<CreateAdPayload>) { setForm((f) => ({ ...f, ...p })); }

  function handleFileSelect(file: File) {
    uploadFile(
      file,
      setUploadState,
      (url, mediaType) => patch({ mediaUrl: url, mediaType }),
    );
  }

  function clearUpload() {
    setUploadState({ status: 'idle' });
    patch({ mediaUrl: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) { toast.error('Şirket adı gerekli.'); return; }
    if (form.mediaType !== 'TEXT' && !(form.mediaUrl ?? '').trim()) { toast.error('Medya dosyası gerekli.'); return; }
    if (form.mediaType === 'TEXT' && !form.adText?.trim()) { toast.error('Reklam yazısı gerekli.'); return; }
    if (!form.targetUrl.trim()) { toast.error('Hedef URL gerekli.'); return; }

    const payload =
      form.mediaType === 'TEXT'
        ? {
            companyName:     form.companyName.trim(),
            targetUrl:       form.targetUrl.trim(),
            mediaType:       'TEXT' as const,
            mediaUrl:        null,
            adText:          form.adText ?? '',
            backgroundColor: form.backgroundColor ?? '',
            textColor:       form.textColor ?? '#ffffff',
            fontSize:        form.fontSize ?? '1.875rem',
            isActive:        form.isActive,
          }
        : { ...form, companyName: form.companyName.trim(), targetUrl: form.targetUrl.trim() };

    console.log('FRONTEND_SENDING_PAYLOAD (edit):', payload);

    setSaving(true);
    try {
      const updated = await advertisementsService.update(ad.id, payload as CreateAdPayload);
      onSave(updated);
      toast.success('Reklam güncellendi.');
    } catch {
      toast.error('Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-blue-600" /> Reklamı Düzenle
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Kapat">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Company + Target URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Şirket Adı</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => patch({ companyName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Hedef URL <span className="text-gray-400 font-normal">(Hedef Site)</span>
              </label>
              <input
                type="url"
                value={form.targetUrl}
                onChange={(e) => patch({ targetUrl: e.target.value })}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              />
            </div>
          </div>

          {/* Media type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Medya Türü</label>
            <select
              value={form.mediaType}
              onChange={(e) => patch({ mediaType: e.target.value as CreateAdPayload['mediaType'] })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white transition"
            >
              <option value="IMAGE">Resim (IMAGE)</option>
              <option value="GIF">GIF</option>
              <option value="VIDEO">Video (VIDEO)</option>
              <option value="TEXT">Yazı / Tasarım (TEXT)</option>
            </select>
          </div>

          {/* Conditional media section */}
          {form.mediaType === 'TEXT' ? (
            <TextDesignStudio form={form} onChange={patch} />
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Medya Dosyası</label>
              <MediaUploader uploadState={uploadState} onChange={handleFileSelect} onClear={clearUpload} />
            </div>
          )}

          {/* isActive */}
          <div className="flex items-center gap-2">
            <input
              id="edit-isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => patch({ isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="edit-isActive" className="text-sm text-gray-700 font-medium">Yayında</label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving || uploadState.status === 'uploading'}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminAdvertisementsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [mounted,     setMounted]     = useState(false);
  const [ads,         setAds]         = useState<Advertisement[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [form,        setForm]        = useState<CreateAdPayload>(EMPTY);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [creating,    setCreating]    = useState(false);
  const [busyIds,     setBusyIds]     = useState<Set<string>>(new Set());
  const [editingAd,   setEditingAd]   = useState<Advertisement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || user?.userType !== 'ADMIN') router.replace('/admin/login');
  }, [mounted, isAuthenticated, user, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated || user?.userType !== 'ADMIN') return;
    let cancelled = false;
    setLoading(true);
    advertisementsService
      .getAll()
      .then((data) => { if (!cancelled) setAds(data); })
      .catch(() => { if (!cancelled) toast.error('Reklamlar yüklenemedi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mounted, isAuthenticated, user]);

  if (!mounted) return null;
  if (!isAuthenticated || user?.userType !== 'ADMIN') return null;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function patchForm(p: Partial<CreateAdPayload>) { setForm((f) => ({ ...f, ...p })); }
  function addBusy(id: string)    { setBusyIds((s) => new Set(s).add(id)); }
  function removeBusy(id: string) { setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; }); }

  function handleFileSelect(file: File) {
    uploadFile(
      file,
      setUploadState,
      (url, mediaType) => patchForm({ mediaUrl: url, mediaType }),
    );
  }

  function clearUpload() {
    setUploadState({ status: 'idle' });
    patchForm({ mediaUrl: '' });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) { toast.error('Şirket adı gerekli.'); return; }
    if (form.mediaType !== 'TEXT' && !(form.mediaUrl ?? '').trim()) { toast.error('Lütfen önce bir medya dosyası yükleyin.'); return; }
    if (form.mediaType === 'TEXT' && !form.adText?.trim()) { toast.error('Reklam yazısı gerekli.'); return; }
    if (!form.targetUrl.trim()) { toast.error('Hedef URL gerekli.'); return; }

    // Build an explicit payload so TEXT ads never send an empty-string mediaUrl
    const payload =
      form.mediaType === 'TEXT'
        ? {
            companyName:     form.companyName.trim(),
            targetUrl:       form.targetUrl.trim(),
            mediaType:       'TEXT' as const,
            mediaUrl:        null,
            adText:          form.adText ?? '',
            backgroundColor: form.backgroundColor ?? '',
            textColor:       form.textColor ?? '#ffffff',
            fontSize:        form.fontSize ?? '1.875rem',
            isActive:        form.isActive,
          }
        : { ...form, companyName: form.companyName.trim(), targetUrl: form.targetUrl.trim() };

    console.log('FRONTEND_SENDING_PAYLOAD:', payload);

    setCreating(true);
    try {
      const created = await advertisementsService.create(payload as CreateAdPayload);
      setAds((prev) => [created, ...prev]);
      setForm(EMPTY);
      setUploadState({ status: 'idle' });
      toast.success('Reklam oluşturuldu.');
    } catch {
      toast.error('Reklam oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(ad: Advertisement) {
    addBusy(ad.id);
    try {
      await advertisementsService.toggleActive(ad.id, !ad.isActive);
      setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, isActive: !a.isActive } : a));
    } catch {
      toast.error('Durum güncellenemedi.');
    } finally {
      removeBusy(ad.id);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu reklamı silmek istediğinizden emin misiniz?')) return;
    addBusy(id);
    try {
      await advertisementsService.delete(id);
      setAds((prev) => prev.filter((a) => a.id !== id));
      toast.success('Reklam silindi.');
    } catch {
      toast.error('Silme işlemi başarısız.');
    } finally {
      removeBusy(id);
    }
  }

  function handleEditSave(updated: Advertisement) {
    setAds((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    setEditingAd(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Edit modal */}
      {editingAd && (
        <EditModal
          ad={editingAd}
          onClose={() => setEditingAd(null)}
          onSave={handleEditSave}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reklam Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ana sayfa sponsorlu reklam alanını yönetin</p>
          </div>
        </div>

        <AdminNav />

        {/* ── Create form ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Yeni Reklam Ekle
          </h2>

          <form onSubmit={handleCreate} className="space-y-5">

            {/* Row 1: Company + Target URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Şirket Adı</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => patchForm({ companyName: e.target.value })}
                  placeholder="Örn. Forsa Motors"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Hedef URL <span className="text-gray-400 font-normal">(Hedef Site)</span>
                </label>
                <input
                  type="url"
                  value={form.targetUrl}
                  onChange={(e) => patchForm({ targetUrl: e.target.value })}
                  placeholder="https://orneksirket.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                />
              </div>
            </div>

            {/* Row 2: Media type selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Medya Türü
                  {uploadState.status === 'done' && form.mediaType !== 'TEXT' && (
                    <span className="ml-2 text-[10px] text-green-600 font-medium">(otomatik algılandı)</span>
                  )}
                </label>
                <select
                  value={form.mediaType}
                  onChange={(e) => patchForm({ mediaType: e.target.value as CreateAdPayload['mediaType'] })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white transition"
                >
                  <option value="IMAGE">Resim (IMAGE)</option>
                  <option value="GIF">GIF</option>
                  <option value="VIDEO">Video (VIDEO)</option>
                  <option value="TEXT">Yazı / Tasarım (TEXT)</option>
                </select>

                <div className="mt-4 flex items-center gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => patchForm({ isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Hemen yayınla</label>
                </div>
              </div>

              {/* Right: file upload (only for non-TEXT) */}
              {form.mediaType !== 'TEXT' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Medya Dosyası</label>
                  <MediaUploader uploadState={uploadState} onChange={handleFileSelect} onClear={clearUpload} />
                </div>
              )}
            </div>

            {/* Text design studio — full width when TEXT is selected */}
            {form.mediaType === 'TEXT' && (
              <TextDesignStudio form={form} onChange={patchForm} />
            )}

            {/* Submit */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={creating || uploadState.status === 'uploading'}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Reklam Oluştur
              </button>
            </div>
          </form>
        </div>

        {/* ── Ads table ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Önizleme</th>
                  <th className="px-4 py-3 text-left">Şirket</th>
                  <th className="px-4 py-3 text-left">Tür</th>
                  <th className="px-4 py-3 text-left">Hedef Site</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-left">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                )}

                {!loading && ads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">Henüz reklam yok</p>
                    </td>
                  </tr>
                )}

                {!loading && ads.map((ad) => {
                  const busy = busyIds.has(ad.id);
                  return (
                    <tr key={ad.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors">

                      {/* Preview */}
                      <td className="px-4 py-3">
                        <div className="w-20 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                          {ad.mediaType === 'TEXT' ? (
                            <div
                              className="w-full h-full flex items-center justify-center p-1"
                              style={{ background: ad.backgroundColor ?? '#1e3a8a' }}
                            >
                              <p
                                className="text-center font-bold leading-none truncate text-[9px]"
                                style={{ color: ad.textColor ?? '#fff' }}
                              >
                                {ad.adText}
                              </p>
                            </div>
                          ) : ad.mediaUrl ? (
                            ad.mediaType === 'VIDEO' ? (
                              <video src={resolveMediaUrl(ad.mediaUrl)} muted className="w-full h-full object-cover" />
                            ) : (
                              <img src={resolveMediaUrl(ad.mediaUrl)} alt={ad.companyName} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <ImageOff className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">{ad.companyName}</p>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          ad.mediaType === 'TEXT'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {ad.mediaType}
                        </span>
                      </td>

                      {/* Target URL */}
                      <td className="px-4 py-3">
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-xs truncate max-w-[180px] block"
                        >
                          {ad.targetUrl}
                        </a>
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(ad)}
                          disabled={busy}
                          className="flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : ad.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                          <span className={ad.isActive ? 'text-green-600' : 'text-gray-400'}>
                            {ad.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </button>
                      </td>

                      {/* Actions: Edit + Delete */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingAd(ad)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Pencil className="w-3 h-3" /> Düzenle
                          </button>
                          <button
                            onClick={() => handleDelete(ad.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
