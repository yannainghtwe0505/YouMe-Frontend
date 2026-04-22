import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

const MAX_PHOTOS = 6;

function errMessage(err, t) {
  const d = err.response?.data;
  const fb = t('errors.generic');
  if (d == null) return err.message || fb;
  if (typeof d === 'string') return d;
  if (typeof d.error === 'string') return d.error;
  return err.message || fb;
}

export default function PhotosPage() {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState(null);
  const [error, setError] = useState(null);

  const loadPhotos = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await api.get('/photos');
      setPhotos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(errMessage(err, t));
    } finally {
      setListLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const removePhoto = async (id) => {
    if (!window.confirm(t('photos.confirmRemove'))) return;
    setBusyPhotoId(id);
    setError(null);
    try {
      await api.delete(`/photos/${id}`);
      await loadPhotos();
    } catch (err) {
      setError(errMessage(err, t));
    } finally {
      setBusyPhotoId(null);
    }
  };

  const makePrimary = async (id) => {
    setBusyPhotoId(id);
    setError(null);
    try {
      await api.put(`/photos/${id}/primary`);
      await loadPhotos();
    } catch (err) {
      setError(errMessage(err, t));
    } finally {
      setBusyPhotoId(null);
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (photos.length >= MAX_PHOTOS) {
      setError(t('photos.errorMaxPhotos', { max: MAX_PHOTOS }));
      return;
    }

    setError(null);
    setUploading(true);

    const filename = file.name || 'photo.jpg';
    const contentType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';

    try {
      const presign = await api.post(
        `/photos/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`,
      );
      const { uploadUrl, s3Key } = presign.data;
      if (!uploadUrl || !s3Key) {
        setError(t('photos.errorInvalidResponse'));
        return;
      }

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!putRes.ok) {
        setError(t('photos.errorUploadFailed', { status: putRes.status }));
        return;
      }

      await api.post(`/photos/complete?s3Key=${encodeURIComponent(s3Key)}`);
      await loadPhotos();
    } catch (err) {
      setError(errMessage(err, t));
    } finally {
      setUploading(false);
    }
  };

  const count = photos.length;
  const atLimit = count >= MAX_PHOTOS;

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px',
          }}
          >
            {t('photos.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {t('photos.subtitle', { max: MAX_PHOTOS })}
            {' '}
            <Link to="/profile">{t('photos.backToProfile')}</Link>
          </p>
          <p style={{ fontSize: '15px', fontWeight: 600, marginTop: '12px', color: 'var(--text-primary)' }}>
            {listLoading ? '…' : t('photos.count', { count, max: MAX_PHOTOS })}
          </p>
        </div>

        <div className="form-group" style={{ textAlign: 'center' }}>
          <input
            id="photo-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            disabled={uploading || atLimit || listLoading}
            onChange={onPickFile}
          />
          <label htmlFor="photo-file-input" style={{ display: 'inline-block', width: '100%' }}>
            <span
              className={`btn btn-primary${atLimit || uploading || listLoading ? '' : ''}`}
              style={{
                width: '100%',
                display: 'inline-block',
                textAlign: 'center',
                cursor: atLimit || uploading || listLoading ? 'not-allowed' : 'pointer',
                opacity: atLimit || uploading || listLoading ? 0.55 : 1,
                pointerEvents: atLimit || uploading || listLoading ? 'none' : 'auto',
              }}
            >
              {uploading ? t('photos.uploading') : atLimit ? t('photos.atLimit') : t('photos.add')}
            </span>
          </label>
        </div>

        {listLoading ? (
          <div className="loading" style={{ padding: '24px', textAlign: 'center' }}>
            <div className="pulse">{t('photos.loading')}</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginTop: '16px',
            }}
          >
            {photos.map((p) => (
              <div
                key={p.id}
                className="photo-cell"
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-lg, 12px)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundImage: p.url ? `url(${p.url})` : 'none',
                  backgroundColor: 'var(--bg-secondary)',
                  border: p.primary ? '2px solid var(--primary)' : '1px solid var(--bg-secondary)',
                  position: 'relative',
                }}
                title={p.primary ? t('photos.primaryTooltip') : ''}
              >
                {p.primary ? (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                    }}
                  >
                    {t('photos.mainBadge')}
                  </span>
                ) : null}
                <div className="photo-cell-actions">
                  {!p.primary ? (
                    <button
                      type="button"
                      className="btn btn-secondary photo-cell-btn"
                      disabled={busyPhotoId != null || listLoading}
                      onClick={() => makePrimary(p.id)}
                    >
                      {busyPhotoId === p.id ? '…' : t('photos.makeMain')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost photo-cell-btn photo-cell-remove"
                    disabled={busyPhotoId != null || listLoading}
                    onClick={() => removePhoto(p.id)}
                  >
                    {busyPhotoId === p.id ? '…' : t('photos.remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? (
          <div style={{
            color: '#e17055',
            textAlign: 'center',
            padding: '12px',
            marginTop: '16px',
            background: 'rgba(225, 112, 85, 0.1)',
            borderRadius: 'var(--border-radius)',
            fontSize: '14px',
          }}
          >
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
