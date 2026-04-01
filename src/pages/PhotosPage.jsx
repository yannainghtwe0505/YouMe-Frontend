import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const MAX_PHOTOS = 6;

function errMessage(err) {
  const d = err.response?.data;
  if (d == null) return err.message || 'Something went wrong';
  if (typeof d === 'string') return d;
  if (typeof d.error === 'string') return d.error;
  return err.message || 'Something went wrong';
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const loadPhotos = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await api.get('/photos');
      setPhotos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (photos.length >= MAX_PHOTOS) {
      setError(`You already have ${MAX_PHOTOS} photos. Remove one before adding another.`);
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
        setError('Invalid response from server.');
        return;
      }

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!putRes.ok) {
        setError(`Upload failed (${putRes.status}). Check storage configuration.`);
        return;
      }

      await api.post(`/photos/complete?s3Key=${encodeURIComponent(s3Key)}`);
      await loadPhotos();
    } catch (err) {
      setError(errMessage(err));
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
            Photos
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            Up to {MAX_PHOTOS} photos — shown on your profile and in Discover.
            {' '}
            <Link to="/profile">Back to profile</Link>
          </p>
          <p style={{ fontSize: '15px', fontWeight: 600, marginTop: '12px', color: 'var(--text-primary)' }}>
            {listLoading ? '…' : `${count} / ${MAX_PHOTOS}`}
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
              {uploading ? 'Uploading…' : atLimit ? 'Photo limit reached' : 'Add photo'}
            </span>
          </label>
        </div>

        {listLoading ? (
          <div className="loading" style={{ padding: '24px', textAlign: 'center' }}>
            <div className="pulse">Loading photos…</div>
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
                title={p.primary ? 'Primary photo' : ''}
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
                    Main
                  </span>
                ) : null}
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
