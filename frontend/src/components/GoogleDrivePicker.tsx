import React, { useState, useEffect } from 'react';
import { X, FileText, File, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';

interface GoogleDrivePickerProps {
  workspaceId: string;
  onClose: () => void;
  onImport: (documentIds: string[]) => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string;
  iconLink: string | null;
}

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({
  workspaceId,
  onClose,
  onImport,
}) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    message: string;
    documentIds?: string[];
  } | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.listGoogleDriveFiles();
      setFiles(response.files);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load Google Drive files');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFileIds);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFileIds(newSelection);
  };

  const handleImport = async () => {
    if (selectedFileIds.size === 0) return;

    setImporting(true);
    setError('');
    try {
      const result = await api.importFromGoogleDrive(
        workspaceId,
        Array.from(selectedFileIds)
      );

      setImportStatus({
        success: result.imported_count > 0,
        message: `Imported ${result.imported_count} file(s)${
          result.failed_count > 0 ? `, ${result.failed_count} failed` : ''
        }`,
        documentIds: result.document_ids,
      });

      // If successful, call onImport after a short delay
      if (result.imported_count > 0) {
        setTimeout(() => {
          onImport(result.document_ids);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import files');
      setImportStatus({
        success: false,
        message: 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" size={20} />;
    if (mimeType.includes('document') || mimeType.includes('word'))
      return <FileText className="text-blue-500" size={20} />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
      return <File className="text-green-500" size={20} />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
      return <File className="text-orange-500" size={20} />;
    return <File className="text-gray-500" size={20} />;
  };

  const formatFileSize = (bytes: string | null): string => {
    if (!bytes) return 'Unknown size';
    const num = parseInt(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import from Google Drive</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select files to import into your workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error && !importStatus ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          ) : importStatus ? (
            <div
              className={`p-4 border rounded-lg flex items-start gap-3 ${
                importStatus.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    importStatus.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {importStatus.message}
                </p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <File className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">No files found in your Google Drive</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => toggleFileSelection(file.id)}
                  disabled={importing}
                  className={`w-full p-4 border-2 rounded-lg transition-all text-left hover:border-blue-300 ${
                    selectedFileIds.has(file.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">{getFileIcon(file.mimeType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(file.size)} •{' '}
                        {new Date(file.modifiedTime).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedFileIds.has(file.id) && (
                      <CheckCircle2 className="text-blue-600 flex-shrink-0" size={24} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && files.length > 0 && !importStatus && (
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedFileIds.size} file{selectedFileIds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary" disabled={importing}>
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedFileIds.size === 0 || importing}
                className="btn-primary"
              >
                {importing ? 'Importing...' : `Import ${selectedFileIds.size} file(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
