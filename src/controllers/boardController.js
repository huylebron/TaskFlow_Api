/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */
import { StatusCodes } from 'http-status-codes'
import { boardService } from '~/services/boardService'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import fs from 'fs'

const createNew = async (req, res, next) => {
  try {
    // console.log('req.body: ', req.body)
    // console.log('req.query: ', req.query)
    // console.log('req.params: ', req.params)
    // console.log('req.files: ', req.files)
    // console.log('req.cookies: ', req.cookies)
    // console.log('req.jwtDecoded: ', req.jwtDecoded)

    const userId = req.jwtDecoded._id

    // Điều hướng dữ liệu sang tầng Service
    const createdBoard = await boardService.createNew(userId, req.body)

    // Có kết quả thì trả về phía Client
    res.status(StatusCodes.CREATED).json(createdBoard)
  } catch (error) { next(error) }
}

const getDetails = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const boardId = req.params.id

    const board = await boardService.getDetails(userId, boardId)
    res.status(StatusCodes.OK).json(board)
  } catch (error) { next(error) }
}

const update = async (req, res, next) => {
  try {
    const boardId = req.params.id
    const updatedBoard = await boardService.update(boardId, req.body)

    res.status(StatusCodes.OK).json(updatedBoard)
  } catch (error) { next(error) }
}

const moveCardToDifferentColumn = async (req, res, next) => {
  try {
    const result = await boardService.moveCardToDifferentColumn(req.body)

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Lấy danh sách các boards của một user
 * @param {Object} req.query - query url có các thông tin page, itemsPerPage, q
 * @param {number} req.query.page - số trang
 * @param {number} req.query.itemsPerPage - số lượng item trên một trang
 * @param {string} req.query.q - chuỗi tìm kiếm
 * @returns {Promise<Board[]>} - danh sách các boards
 */
const getBoards = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    // page và itemsPerPage được truyền vào trong query url từ phía FE nên BE sẽ lấy thông qua req.query
    const { page, itemsPerPage, q } = req.query
    const queryFilters = q
    // console.log(queryFilters)

    const results = await boardService.getBoards(userId, page, itemsPerPage, queryFilters)

    res.status(StatusCodes.OK).json(results)
  } catch (error) { next(error) }
}

const updateBackground = async (req, res, next) => {
  try {
    const boardId = req.params.id
    let updateData = { ...req.body }

    // Nếu có file upload (multer lưu ở req.file)
    if (req.file) {
      // Đọc file buffer
      const fileBuffer = fs.readFileSync(req.file.path)
      // Upload lên Cloudinary, folder: 'board-backgrounds'
      const result = await CloudinaryProvider.streamUpload(fileBuffer, 'board-backgrounds')
      console.log(result)
      updateData.backgroundUpload = result.secure_url
      // Xóa file tạm sau khi upload
      fs.unlinkSync(req.file.path)
    }

    // Cập nhật background cho board
    const updatedBoard = await boardService.update(boardId, updateData)
    res.status(StatusCodes.OK).json(updatedBoard)
  } catch (error) { next(error) }
}

const deleteBoard = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded._id
    const boardId = req.params.id

    const result = await boardService.deleteBoard(userId, boardId)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

// Thêm label vào board
export const addLabel = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { id, name, color } = req.body;
    if (!id || !name || !color) return res.status(400).json({ message: 'Thiếu thông tin label' });
    const result = await boardService.addLabel(boardId, { id, name, color });
    res.status(200).json(result);
  } catch (error) { next(error); }
};

// Sửa label trong board
export const updateLabel = async (req, res, next) => {
  try {
    const { boardId, labelId } = req.params;
    const { name, color } = req.body;
    const result = await boardService.updateLabel(boardId, labelId, { name, color });
    res.status(200).json(result);
  } catch (error) { next(error); }
};

// Xoá label khỏi board
export const deleteLabel = async (req, res, next) => {
  try {
    const { boardId, labelId } = req.params;
    const result = await boardService.deleteLabel(boardId, labelId);
    res.status(200).json(result);
  } catch (error) { next(error); }
};

export const boardController = {
  createNew,
  getDetails,
  update,
  moveCardToDifferentColumn,
  getBoards,
  deleteBoard,
  addLabel,
  updateLabel,
  deleteLabel,
  updateBackground
}
