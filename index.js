// Librerias nativas
const fs = require('fs')
const path = require('path')

// Libreria de terceros
const puppeteer = require('puppeteer')
// const ExcelJS = require('exceljs')
const delay = require('delay')

const root = path.dirname(require.main.filename)

const runCrawler = async () => {
    const pueblosTotales = []
    try {
        // Configurar Inicial del Navegador
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1920,1080'],
            headless: true,
            defaultViewport: null,
        })
        const page = await browser.newPage()
        await page._client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: root })
        await page.goto('http://sige.inei.gob.pe/test/atlas/')

        console.log('Accedí a la página con éxito!! ')

        // // selecciona el departamento
        // let resultadosScrapper = await page.evaluate(() => {
        //     const select = document.getElementById('cboDepartamento')
        //     const ress = []
        //     for (const option of select) {
        //         if (['LAMBAYEQUE'].includes(option.innerText)) {
        //             ress.push({
        //                 region: option.innerText,
        //                 valueOption: option.value,
        //                 provincias: [],
        //             })
        //         }
        //     }
        //     return ress
        // })

        // // selecciona la provincia
        // for (let i = 0; i < resultadosScrapper.length; i++) {
        //     await page.select('#cboDepartamento', resultadosScrapper[i].valueOption)
        //     await delay(500)
        //     resultadosScrapper[i].provincias = await page.evaluate(() => {
        //         const select = document.getElementById('cboProvincia')
        //         const ress = []
        //         for (const option of select) {
        //             ress.push({
        //                 provincia: option.innerText,
        //                 valueOption: option.value,
        //                 distritos: [],
        //             })
        //         }
        //         return ress
        //     })
        // }

        // // selecciona el distrito
        // for (let i = 0; i < resultadosScrapper.length; i++) {
        //     console.log(resultadosScrapper[i].region)
        //     await page.select('#cboDepartamento', resultadosScrapper[i].valueOption)
        //     await delay(1000)
        //     for (let j = 0; j < resultadosScrapper[i].provincias.length ; j++) {
        //         console.log(resultadosScrapper[i].provincias[j].valueOption)
        //         await page.select('#cboProvincia', resultadosScrapper[i].provincias[j].valueOption)
        //         await delay(1000)
        //         resultadosScrapper[i].provincias[j].distritos = await page.evaluate(() => {
        //             const select = document.getElementById('cboDistrito')
        //             const ress = []
        //             for (const option of select) {
        //                 if (option.value.length > 4) {
        //                     ress.push({
        //                         distrito: option.innerText,
        //                         valueOption: option.value,
        //                         pueblos: [],
        //                     })
        //                 }
        //             }
        //             return ress
        //         })
        //     }
        //     console.log(resultadosScrapper[i].valueOption)
        // }

        // // Guardar resultadosScrapper en un json
        // fs.writeFileSync('seleccionablesxxx.json', JSON.stringify(resultadosScrapper, null, 2))

        // Leer un json
        const resultadosScrapper = JSON.parse(fs.readFileSync('seleccionables.json', 'utf8'))
        // resultadosScrapper = resultadosScrapper[0].provincias.slice(1)
        // fs.writeFileSync('seleccionables.json', JSON.stringify(resultadosScrapper, null, 2))

        // Selecciono solo Lambayeque
        console.log(resultadosScrapper[0].region)
        await page.select('#cboDepartamento', resultadosScrapper[0].valueOption)
        await delay(1000)

        // Seleccionar cada provincia
        for (const provincia of resultadosScrapper[0].provincias) {
            await page.select('#cboProvincia', provincia.valueOption)
            await delay(500)
            for (const distrito of provincia.distritos) {
                await page.select('#cboDistrito', distrito.valueOption)
                await delay(500)

                // Selecciona cada pueblo
                const pueblos = await page.evaluate(() => {
                    const select = document.querySelectorAll('#tblResultados > tbody > tr > td > a > li > u')
                    const ar = Array.from(select).map(item => item.innerText)
                    return ar
                })

                await delay(500)

                for (let i = 1; i < pueblos.length + 1; i++) {
                    console.log(`${provincia.provincia} => ${distrito.distrito} => ${pueblos[i - 1]}`)
                    await page.click(`#tblResultados > tbody > tr:nth-child(${i}) > td > a > li > u`)
                    await delay(2500)

                    // Abrir la tabla
                    await page.mouse.click(1106, 596, { button: 'left', clickCount: 2 })
                    await page.waitForSelector('[aria-describedby="tblArea_informacion_vnac"]')
                    await delay(500)
                    // capturar los datos
                    const cp = await page.evaluate(() => {
                        const values = Array.from(document.querySelectorAll('[aria-describedby="tblArea_informacion_vnac"]'))
                        const keys = Array.from(document.querySelectorAll('[aria-describedby="tblArea_informacion_descripcion"]'))
                        const ress = {}
                        for (let i = 0; i < keys.length; i++) {
                            ress[keys[i].innerText] = values[i].innerText
                        }
                        return ress
                    })

                    pueblosTotales.push(cp)

                    // Cerrar la tabla
                    await page.mouse.click(1287, 304, { button: 'left', clickCount: 1 })
                    await delay(500)
                }
            }
        }
        await browser.close()
        return pueblosTotales
    } catch (error) {
        throw new Error(error.message)
    }
}

(async () => {
    try {
        const pueblosTotales = await runCrawler()
        // Escribir un archivo json
        fs.writeFileSync('resultadoFinal.json', JSON.stringify(pueblosTotales))
    } catch (e) {
        console.log(e)
    }
})()
