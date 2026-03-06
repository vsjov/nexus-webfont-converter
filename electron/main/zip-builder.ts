import fs from 'node:fs'
import archiver from 'archiver'


const buildZip = (sourceDir: string, outputPath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', resolve)
    archive.on('error', reject)

    archive.pipe(output)
    archive.directory(sourceDir, false)
    archive.finalize()
  })

export default buildZip
