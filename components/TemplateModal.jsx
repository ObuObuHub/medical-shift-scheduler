import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { X, Save, Download, Trash2, Calendar, Clock } from './Icons';

export const TemplateModal = ({ 
  isOpen,
  onClose,
  selectedHospital,
  mode // 'save', 'load', or 'delete'
}) => {
  const { templates, loadTemplates, saveTemplate, loadTemplate, deleteTemplate } = useData();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedHospital) {
      loadTemplates(selectedHospital);
    }
  }, [isOpen, selectedHospital, loadTemplates]);

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('Numele șablonului este obligatoriu!');
      return;
    }

    setIsLoading(true);
    try {
      await saveTemplate(selectedHospital, templateName.trim(), templateDescription.trim());
      setTemplateName('');
      setTemplateDescription('');
      onClose();
      alert('Șablonul a fost salvat cu succes!');
    } catch (error) {
      alert(`Eroare la salvarea șablonului: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedTemplate) {
      alert('Selectează un șablon pentru încărcare!');
      return;
    }

    setIsLoading(true);
    try {
      await loadTemplate(selectedTemplate.id);
      onClose();
      alert(`Șablonul "${selectedTemplate.name}" a fost încărcat cu succes!`);
    } catch (error) {
      alert(`Eroare la încărcarea șablonului: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) {
      alert('Selectează un șablon pentru ștergere!');
      return;
    }

    if (!confirm(`Sigur doriți să ștergeți șablonul "${selectedTemplate.name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteTemplate(selectedTemplate.id);
      setSelectedTemplate(null);
      alert(`Șablonul "${selectedTemplate.name}" a fost șters cu succes!`);
    } catch (error) {
      alert(`Eroare la ștergerea șablonului: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const hospitalTemplates = templates.filter(t => t.hospital === selectedHospital);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <Calendar className="w-6 h-6 mr-3 text-blue-600" />
              {mode === 'save' && 'Salvează Șablon'}
              {mode === 'load' && 'Încarcă Șablon'}
              {mode === 'delete' && 'Șterge Șablon'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Save Mode */}
          {mode === 'save' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nume Șablon *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Programare Ianuarie 2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descriere (opțional)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Descriere scurtă a șablonului..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Salvează...' : 'Salvează Șablon'}
                </button>
              </div>
            </div>
          )}

          {/* Load/Delete Mode */}
          {(mode === 'load' || mode === 'delete') && (
            <div className="space-y-4">
              {hospitalTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nu există șabloane salvate pentru acest spital</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hospitalTemplates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(template.createdAt).toLocaleDateString('ro-RO')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hospitalTemplates.length > 0 && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Anulează
                  </button>
                  
                  {mode === 'load' && (
                    <button
                      onClick={handleLoad}
                      disabled={!selectedTemplate || isLoading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isLoading ? 'Încarcă...' : 'Încarcă Șablon'}
                    </button>
                  )}
                  
                  {mode === 'delete' && (
                    <button
                      onClick={handleDelete}
                      disabled={!selectedTemplate || isLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isLoading ? 'Șterge...' : 'Șterge Șablon'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};