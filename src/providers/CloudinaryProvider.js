import cloudinary from 'cloudinary'
import streamifier from 'streamifier'
import { env } from '~/config/environment'

/**
* Tài liệu tham khảo
* https://cloudinary.com/blog/node_js_file_upload_to_a_local_server_or_to_the_cloud
*/

// Bước cấu hình cloudinary, sử dụng v2 - version 2
const cloudinaryV2 = cloudinary.v2
cloudinaryV2.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
})

// 🚨 CRITICAL: Enhanced upload function for attachments
const streamUpload = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    // ⚠️ CẨN THẬN: Validate input parameters
    if (!fileBuffer) {
      console.error('❌ Cloudinary upload: File buffer is required')
      return reject(new Error('File buffer is required'))
    }

    if (!folderName || typeof folderName !== 'string') {
      console.error('❌ Cloudinary upload: Folder name must be a valid string')
      return reject(new Error('Folder name must be a valid string'))
    }

    if (fileBuffer.length === 0) {
      console.error('❌ Cloudinary upload: File buffer is empty')
      return reject(new Error('File buffer is empty'))
    }

    console.log('🚀 Starting Cloudinary upload:', {
      folderName,
      bufferSize: fileBuffer.length,
      bufferType: typeof fileBuffer
    })
    
    try {
      // 🔥 QUAN TRỌNG: Enhanced upload options for attachments
      const uploadOptions = {
        folder: folderName,
        resource_type: 'auto', // 🚨 CRITICAL: Support all file types (images, videos, raw files)
        use_filename: true,     // Preserve original filename
        unique_filename: true,  // Ensure unique filenames
        overwrite: false,       // Don't overwrite existing files
        quality: 'auto:good',   // Optimize quality for images
        fetch_format: 'auto'    // Auto format optimization
      }
      
      // Tạo upload stream với enhanced error handling
      const stream = cloudinaryV2.uploader.upload_stream(uploadOptions, (err, result) => {
        if (err) {
          console.error('❌ Cloudinary upload error:', err)
          reject(new Error(`Cloudinary upload failed: ${err.message}`))
        } else if (!result || !result.public_id) {
          // 🚨 CRITICAL: Ensure public_id exists for deletion
          console.error('❌ Cloudinary upload missing public_id:', result)
          reject(new Error('Upload succeeded but missing public_id'))
        } else {
          console.log('✅ Cloudinary upload success:', {
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type,
            format: result.format,
            bytes: result.bytes
          })
          resolve(result)
        }
      })
      
      // 🔥 QUAN TRỌNG: Handle stream errors
      stream.on('error', (streamError) => {
        console.error('❌ Upload stream error:', streamError)
        reject(new Error(`Upload stream failed: ${streamError.message}`))
      })
      
      // Thực hiện upload với error handling
      streamifier.createReadStream(fileBuffer).pipe(stream)
      
    } catch (error) {
      console.error('❌ StreamUpload error:', error)
      reject(new Error(`Upload initialization failed: ${error.message}`))
    }
  })
}

// 🚨 CRITICAL: Enhanced delete function with better error handling
const deleteResource = (publicId) => {
  return new Promise((resolve, reject) => {
    // ⚠️ CẨN THẬN: Validate publicId
    if (!publicId || typeof publicId !== 'string') {
      console.warn('⚠️ Delete resource called with empty publicId, skipping...')
      return resolve({ result: 'not found' }) // Graceful handling
    }
    
    try {
      console.log(`🗑️ Attempting to delete Cloudinary resource: ${publicId}`)
      
      cloudinaryV2.uploader.destroy(publicId, (err, result) => {
        if (err) {
          console.error(`❌ Cloudinary delete error for ${publicId}:`, err)
          reject(new Error(`Failed to delete resource: ${err.message}`))
        } else {
          console.log(`✅ Cloudinary delete result for ${publicId}:`, result)
          
          // 🔥 QUAN TRỌNG: Handle different result statuses
          if (result.result === 'ok') {
            console.log(`✅ Successfully deleted ${publicId}`)
          } else if (result.result === 'not found') {
            console.warn(`⚠️ Resource ${publicId} not found, may already be deleted`)
          } else {
            console.warn(`⚠️ Unexpected delete result for ${publicId}:`, result.result)
          }
          
          resolve(result)
        }
      })
      
    } catch (error) {
      console.error(`❌ Delete resource error for ${publicId}:`, error)
      reject(new Error(`Delete operation failed: ${error.message}`))
    }
  })
}

// 🚀 BONUS: Bulk delete function for cleanup operations
const deleteMultipleResources = async (publicIds) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return { success: [], failed: [] }
  }
  
  const results = { success: [], failed: [] }
  
  // Delete in parallel for better performance
  const deletePromises = publicIds.map(async (publicId) => {
    try {
      const result = await deleteResource(publicId)
      results.success.push({ publicId, result })
    } catch (error) {
      results.failed.push({ publicId, error: error.message })
    }
  })
  
  await Promise.all(deletePromises)
  
  console.log(`🗑️ Bulk delete completed: ${results.success.length} success, ${results.failed.length} failed`)
  return results
}

// 🚀 BONUS: Helper function to create attachment folder name
const createAttachmentFolder = (cardId) => {
  if (!cardId) {
    return 'card-attachments/general'
  }
  return `card-attachments/${cardId}`
}

// 🚀 BONUS: Get file info from Cloudinary
const getResourceInfo = (publicId) => {
  return new Promise((resolve, reject) => {
    if (!publicId) {
      return reject(new Error('Public ID is required'))
    }
    
    cloudinaryV2.api.resource(publicId, (error, result) => {
      if (error) {
        reject(new Error(`Failed to get resource info: ${error.message}`))
      } else {
        resolve(result)
      }
    })
  })
}

export const CloudinaryProvider = { 
  streamUpload, 
  deleteResource,
  deleteMultipleResources,
  createAttachmentFolder,
  getResourceInfo
}
