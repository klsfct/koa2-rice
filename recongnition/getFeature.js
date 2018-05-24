/**
 * 图像颜色、纹理、形状特征提取
 */
const path = require('path')
const cv = require('opencv')
const chalk = require('chalk')

/** 
 * HSI 中心矩法提取图像颜色特征
 * 
 * @param {Object} img 图像像素矩阵
 * @return {Object} 颜色特征向量
 */
function calculateColorFeature(img) {
  const width = img.width()
  const height = img.height()
  let sumH = sumS = sumI = 0, M = {MH: [], MS: [], MI: []}, N = width * height
  for(let j = 0; j < width; j++) {
    for(let k = 0; k < height; k++) {
      // 获取图像矩阵 RGB，OpenCV 中，RGB 图像的通道顺序为 BGR
      let rgb = img.pixel(j, k)
      let r = rgb[2]
      let g = rgb[1]
      let b = rgb[0]
      // 坐标变换法计算当前像素点的 H、S、I 值
      let angle = g === b ? 0 : Math.PI / 2 - Math.atan((2 * r - g - b) / Math.pow(3, 0.5) / (g - b))
      let h = g >= b ? angle : angle + Math.PI
      let s = 2 * Math.sqrt(((r - g) * (r - g) + (r - b) * (g - b))) / Math.sqrt(6)
      let i = (r + g + b) / Math.sqrt(3)
      sumH += h
      sumS += s
      sumI += i
    }
  }
  // 计算各个通道第一阶中心矩
  M.MH[0] = sumH / N
  M.MS[0] = sumS / N
  M.MI[0] = sumI / N

  // 计算各个通道第二阶中心矩和第三阶中心矩
  for(let j = 0; j < width; j++) {
    for(let k = 0; k < height; k++) {
      // 获取图像矩阵 RGB，OpenCV 中，RGB 图像的通道顺序为 BGR
      let rgb = img.pixel(j, k)
      let r = rgb[2]
      let g = rgb[1]
      let b = rgb[0]
      // 坐标变换法计算当前像素点的 H、S、I 值
      let angle = g === b ? 0 : Math.PI / 2 - Math.atan((2 * r - g - b) / Math.pow(3, 0.5) / (g - b))
      let h = g >= b ? angle : angle + Math.PI
      let s = 2 * Math.sqrt(((r - g) * (r - g) + (r - b) * (g - b))) / Math.sqrt(6)
      let i = (r + g + b) / Math.sqrt(3)
      M.MH[1] = M.MH[1] === void 0 ? (h - M.MH[0]) * (h - M.MH[0]) : M.MH[1] + (h - M.MH[0]) * (h - M.MH[0])
      M.MH[2] = M.MH[2] === void 0 ? Math.pow((h - M.MH[0]), 3) : M.MH[2] + Math.pow((h - M.MH[0]), 3)

      M.MS[1] = M.MS[1] === void 0 ? (s - M.MS[0]) * (s - M.MS[0]) : M.MS[1] + (s - M.MS[0]) * (s - M.MS[0])
      M.MS[2] = M.MS[2] === void 0 ? Math.pow((s - M.MS[0]), 3) : M.MS[2] + Math.pow((s - M.MS[0]), 3)

      M.MI[1] = M.MI[1] === void 0 ? (i - M.MI[0]) * (i - M.MI[0]) : M.MI[1] + (i - M.MI[0]) * (i - M.MI[0])
      M.MI[2] = M.MI[2] === void 0 ? Math.pow((i - M.MI[0]), 3) : M.MI[2] + Math.pow((i - M.MI[0]), 3)
    }
  }
  M.MH[1] = Math.sqrt(M.MH[1] / N)
  M.MH[2] = Math.cbrt(M.MH[2] / N)
  M.MS[1] = Math.sqrt(M.MS[1] / N)
  M.MS[2] = Math.cbrt(M.MS[2] / N)
  M.MI[1] = Math.sqrt(M.MI[1] / N)
  M.MI[2] = Math.cbrt(M.MI[2] / N)
  return [].concat(M.MH, M.MS, M.MI)
}

/** 
 * 灰度共生矩阵提取图像纹理特征
 * 
 * @param {Object} img 图像像素矩阵
 * @return {Object} 图像纹理特征向量
 */
function calculateTextureFeature(img) {
  const width = img.width()
  const height = img.height()
  let initGLCM = [], GLCM = []
  GLCM[0] = [], GLCM[1] = [], GLCM[2] = [], GLCM[3] = []
  // 图像灰度化并降低灰度等级
  for(let i=0; i<width; i++) {
    initGLCM[i] = []
    for(let j=0; j<height; j++) {
      // 获取图像矩阵 RGB，OpenCV 中，RGB 图像的通道顺序为 BGR
      let rgb = img.pixel(i, j)
      let r = rgb[2]
      let g = rgb[1]
      let b = rgb[0]
      initGLCM[i][j] = parseInt((0.3 * r + 0.59 * g + 0.11 * b) / 32) + 1
    }
  }
  // 计算图像0度、45度、90度、135度四个方向的灰度共生矩阵
  for(let i=0; i<8; i++) {
    GLCM[0][i] = [], GLCM[1][i] = [], GLCM[2][i] = [], GLCM[3][i] = []
    for(let j=0; j<8; j++) {
      GLCM[0][i][j] = GLCM[1][i][j] = GLCM[2][i][j] = GLCM[3][i][j] = 0
      for(let w=1; w<width; w++) {
        for(let h=0; h<height-1; h++) {
          // 0度方向灰度共生矩阵
          if(initGLCM[w][h] === i && initGLCM[w][h+1] === j && i === j) {
            GLCM[0][i][j] += 2
          } else if(initGLCM[w][h] === i && initGLCM[w][h+1] === j) {
            GLCM[0][i][j]++
          }
          // 45度方向灰度共生矩阵
          if(initGLCM[w][h] === i && initGLCM[w-1][h+1] === j && i === j) {
            GLCM[1][i][j] += 2
          } else if(initGLCM[w][h] === i && initGLCM[w-1][h+1] === j) {
            GLCM[1][i][j]++
          }
          // 90度方向灰度共生矩阵
          if(initGLCM[w][h] === i && initGLCM[w][h-1] === j && i === j) {
            GLCM[2][i][j] += 2
          } else if(initGLCM[w][h] === i && initGLCM[w][h-1] === j) {
            GLCM[2][i][j]++
          }
          // 135度方向灰度共生矩阵
          if(initGLCM[w][h] === i && initGLCM[w-1][h-1] === j && i === j) {
            GLCM[3][i][j] += 2
          } else if(initGLCM[w][h] === i && initGLCM[w-1][h-1] === j) {
            GLCM[3][i][j]++
          }
        }
      }
    }
  }
  // 归一化
  function normalize(glcm) {
		let sum = 0
	    for(let i=0; i<8; i++) {
	    	for(let j=0; j<8; j++) {
          sum += glcm[i][j]
        }
      }
	    for(let i=0; i<8; i++) {
	    	for(let j=0; j<8; j++) {
          glcm[i][j] = glcm[i][j] / sum
        }
      }
	    return glcm
  }
  // 归一化
  for(let i=0; i<4; i++) {
    normalize(GLCM[i])
  }
  // 计算每个灰度共生矩阵的纹理一致性，纹理对比度，纹理熵，纹理相关性
  let consistence = [], contrast = [], entropy = [], correlation = [] 
  for(i=0; i<8; i++) {
    for(j=0; j<8; j++) {
      for(d=0; d<4; d++) {
        	//熵,加0.000001是为了避免值为0
          entropy[d] = entropy[d] === void 0 ? GLCM[d][i][j] * Math.log(GLCM[d][i][j]+0.00001) / Math.log(2) : 
            entropy[d] + GLCM[d][i][j] * Math.log(GLCM[d][i][j]+0.00001) / Math.log(2)
					//对比度,取k=2,入=1
          contrast[d] = contrast[d] === void 0 ? (i-j)*(i-j) * GLCM[d][i][j] :
            contrast[d] + (i-j)*(i-j) * GLCM[d][i][j]
					//一致性(能量)
          consistence[d] = consistence[d] === void 0 ? GLCM[d][i][j] * GLCM[d][i][j] :
            consistence[d] + GLCM[d][i][j] * GLCM[d][i][j]
					//相关性
          correlation[d] = correlation[d] === void 0 ? i * j * GLCM[d][i][j] :
            correlation[d] + i * j * GLCM[d][i][j]
      }
    }
  }
  // console.log(entropy, contrast, consistence, correlation)
  // 计算每个灰度共生矩阵的均值和标准差
  let ux = [], uy = [], ax = [], ay = []
  for(let i=0; i<8; i++) {
    for(let j=0; j<8; j++) {
      for(d=0; d<4; d++) {
        ux[d] = ux[d] === void 0 ? i * GLCM[d][i][j] : ux[d] + i * GLCM[d][i][j]
        uy[d] = uy[d] === void 0 ? j * GLCM[d][i][j] : uy[d] + j * GLCM[d][i][j]
        ax[d] = ax[d] === void 0 ? (i-ux[d]) * (i-ux[d]) * GLCM[d][i][j] : ax[d] + (i-ux[d]) * (i-ux[d]) * GLCM[d][i][j]
        ay[d] = ay[d] === void 0 ? (j-uy[d]) * (j-uy[d]) * GLCM[d][i][j] : ay[d] + (j-uy[d]) * (j-uy[d]) * GLCM[d][i][j]
        ax[d] = Math.sqrt(ax[d])
        ay[d] = Math.sqrt(ay[d])
      }
    }
  }
  // 计算纹理相关性
  for (let d=0; d<4; d++) {
    correlation[d] = (correlation[d] - ux[d] * uy[d]) / ax[d] / ay[d]
  }
  // 期望
	function expect(num) {
		let sum = 0
		for(let i=0; i<num.length; i++)
			sum += num[i]
		return sum / num.length
	}
	// 标准差
	function stdv(num) {
		let avg = expect(num), sum = 0
		for(let i=0; i<num.length; i++)
			sum += Math.pow(num[i]-avg, 2)
		return Math.sqrt(sum / num.length)
  }
  let M = []
  M[0] = expect(consistence)
  M[1] = expect(contrast)
  M[2] = expect(entropy)
  M[3] = expect(correlation)
  M[4] = stdv(consistence)
  M[5] = stdv(contrast)
  M[6] = stdv(entropy)
  M[7] = stdv(correlation)
  return M
}

// 测试 DEMO
// cv.readImage(path.resolve(__dirname, '../public/images/riceBlast/50.jpg'), (err, img) => {
//   if(err) {
//     console.log(chalk.red(err))
//   } else {
//     console.log(calculateTextureFeature(img))
//   }
// })

module.exports = {
  color: calculateColorFeature,
  texture: calculateTextureFeature
}