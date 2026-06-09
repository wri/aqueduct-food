import React from 'react';
import PropTypes from 'prop-types';
import { downloadTemplate } from 'utils/supply-analyzer';

// ─── Bulk result banner ──────────────────────────────────────────────────────

function renderBulkResult(bulkResult) {
  if (!bulkResult) return null;

  if (bulkResult.readError) {
    return (
      <div className="bulk-result -error">
        Could not read the file. Please check it is a valid CSV.
      </div>
    );
  }

  return (
    <div className={`bulk-result${bulkResult.added === 0 ? ' -error' : ' -success'}`}>
      <span>
        {bulkResult.added > 0
          ? `${bulkResult.added} location${bulkResult.added !== 1 ? 's' : ''} added`
          : 'No valid locations found'}
        {bulkResult.skipped.length > 0 && ` · ${bulkResult.skipped.length} row${bulkResult.skipped.length !== 1 ? 's' : ''} skipped`}
      </span>
      {bulkResult.skipped.length > 0 && (
        <ul className="skipped-rows">
          {bulkResult.skipped.map(s => (
            <li key={s.row}>Row {s.row}: invalid {s.reasons.join(', ')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Bulk Upload tab ─────────────────────────────────────────────────────────

const BulkUpload = ({
  uploadFile,
  isDragging,
  bulkResult,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onProcessUpload,
  onClear,
}) => (
  <div className="input-panel-body">
    <p className="bulk-description">
      Download the CSV template, fill in your data, then upload the completed file.
      Valid rows will be appended to the current locations list.
    </p>

    <button type="button" className="template-btn" onClick={downloadTemplate}>
      <span className="template-btn-icon">&#8595;</span> Download Template
    </button>

    <div
      role="button"
      tabIndex={0}
      className={`file-dropzone${isDragging ? ' -dragging' : ''}${uploadFile ? ' -has-file' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current && fileInputRef.current.click()}
      onKeyDown={e => e.key === 'Enter' && fileInputRef.current && fileInputRef.current.click()}
    >
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={e => onFileChange(e.target.files[0])}
      />
      {uploadFile
        ? (
          <span className="file-name">
            <span role="img" aria-label="file" className="file-icon">&#128196;</span>
            {' '}{uploadFile.name}
          </span>
        )
        : (
          <span className="dropzone-hint">
            Drop CSV here or <strong>click to browse</strong>
          </span>
        )
      }
    </div>

    {uploadFile && (
      <div className="panel-footer">
        <button type="button" className="upload-btn" onClick={onProcessUpload}>
          Process Upload
        </button>
        <button
          type="button"
          className="clear-file-btn"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    )}

    {renderBulkResult(bulkResult)}
  </div>
);

BulkUpload.propTypes = {
  uploadFile: PropTypes.object,
  isDragging: PropTypes.bool,
  bulkResult: PropTypes.object,
  fileInputRef: PropTypes.object.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  onProcessUpload: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

BulkUpload.defaultProps = {
  uploadFile: null,
  isDragging: false,
  bulkResult: null,
};

export default BulkUpload;
