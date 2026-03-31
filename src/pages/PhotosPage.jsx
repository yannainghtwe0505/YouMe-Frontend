import React, { useState } from 'react';
import api from '../api';

export default function PhotosPage() {
  const [filename, setFilename] = useState('');
  const [contentType, setContentType] = useState('image/jpeg');
  const [uploadUrl, setUploadUrl] = useState('');
  const [s3Key, setS3Key] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePresign = async () => {
    if (!filename.trim()) {
      setError('Please enter a filename');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post(`/photos/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`);
      setUploadUrl(res.data.uploadUrl);
      if (res.data.s3Key) setS3Key(res.data.s3Key);
    } catch (err) {
      setError('Failed to get upload URL');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!s3Key.trim()) {
      setError('Please enter the S3 key');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.post(`/photos/complete?s3Key=${s3Key}`);
      setS3Key('');
      setUploadUrl('');
      setFilename('');
      setError(null);
    } catch (err) {
      setError('Failed to complete upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            📸 Photo Upload
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            Upload photos to enhance your profile
          </p>
        </div>

        {/* Step 1: Get Presigned URL */}
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px',
          borderRadius: 'var(--border-radius)',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}>
            Step 1: Prepare Upload
          </h3>

          <div className="form-group">
            <input
              value={filename}
              onChange={e => setFilename(e.target.value)}
              placeholder="Photo filename (e.g., my-photo.jpg)"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <select
              value={contentType}
              onChange={e => setContentType(e.target.value)}
              className="form-input"
              disabled={loading}
            >
              <option value="image/jpeg">JPEG Image</option>
              <option value="image/png">PNG Image</option>
              <option value="image/webp">WebP Image</option>
            </select>
          </div>

          <button
            onClick={handlePresign}
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading || !filename.trim()}
          >
            {loading ? 'Preparing...' : 'Get Upload URL'}
          </button>
        </div>

        {/* Step 2: Upload to S3 */}
        {uploadUrl && (
          <div style={{
            background: 'var(--accent-soft)',
            padding: '20px',
            borderRadius: 'var(--border-radius)',
            marginBottom: '20px',
            border: '2px solid rgba(109, 94, 247, 0.35)'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--primary-dark)',
              marginBottom: '12px'
            }}>
              Step 2: Upload Photo
            </h3>

            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              Use this URL to upload your photo directly to our secure storage.
              You can use tools like curl, Postman, or any HTTP client.
            </p>

            <div style={{
              background: 'white',
              padding: '12px',
              borderRadius: 'var(--border-radius)',
              fontSize: '12px',
              wordBreak: 'break-all',
              color: 'var(--text-primary)',
              border: '1px solid var(--bg-secondary)',
              marginBottom: '16px'
            }}>
              {uploadUrl}
            </div>

            <div style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              padding: '12px',
              borderRadius: 'var(--border-radius)',
              fontSize: '14px',
              marginBottom: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <strong>Example curl command:</strong><br />
              <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                curl -X PUT -H "Content-Type: {contentType}" --data-binary @your-photo.jpg "{uploadUrl}"
              </code>
            </div>
          </div>
        )}

        {/* Step 3: Complete Upload */}
        {uploadUrl && (
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '20px',
            borderRadius: 'var(--border-radius)',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              Step 3: Complete Upload
            </h3>

            <div className="form-group">
              <input
                value={s3Key}
                onChange={e => setS3Key(e.target.value)}
                placeholder="S3 Key (from upload response)"
                className="form-input"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleComplete}
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading || !s3Key.trim()}
            >
              {loading ? 'Completing...' : 'Complete Upload'}
            </button>
          </div>
        )}

        {error && (
          <div style={{
            color: '#e17055',
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(225, 112, 85, 0.1)',
            borderRadius: 'var(--border-radius)',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {!uploadUrl && !error && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-light)',
            fontSize: '14px',
            padding: '20px'
          }}>
            💡 Start by entering a filename and getting your upload URL
          </div>
        )}
      </div>
    </div>
  );
}
