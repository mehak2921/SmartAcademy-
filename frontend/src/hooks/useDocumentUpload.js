import { useState, useEffect } from 'react'
import axios from 'axios'
import { supabase } from '../services/supabase'

export function useDocumentUpload() {
  const [file, setFile] = useState(null)
  const [activeDocument, setActiveDocument] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setIsUploading(true)
    
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      const uploadRes = await axios.post('http://localhost:8000/api/documents/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      })
      
      setActiveDocument({ id: uploadRes.data.document_id, name: selectedFile.name })
      setIsProcessing(true)
    } catch (error) {
      console.error(error)
      setFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (!isProcessing || !activeDocument) return
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        const res = await axios.get(
          `http://localhost:8000/api/documents/status?ids=${activeDocument.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.data[0]?.processing_status === 'completed') {
          setIsProcessing(false)
        }
      } catch (err) {
        console.error('Status poll error:', err)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isProcessing, activeDocument])

  const clearUpload = () => {
    setFile(null)
    setActiveDocument(null)
    setIsProcessing(false)
    setIsUploading(false)
  }

  return { file, activeDocument, isUploading, isProcessing, handleFileUpload, clearUpload }
}
