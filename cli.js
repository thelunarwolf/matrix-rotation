const { createReadStream, existsSync } = require("fs");
const { extname } = require('path')
const { parse, format } = require('fast-csv');

const init = () => {
    const filepath = process.argv[2];
    if (!filepath || extname(filepath) !== '.csv') {
        throw new Error('Invalid/Missing File, please provide .csv file')
    }
    if (!existsSync(filepath)) {
        throw new Error('Missing File, please provide input .csv file in directory')
    }
    const responseArray = [];
    try {
        createReadStream(`./${filepath}`)
            .pipe(parse({ headers: true }))
            .on("data", function (row) {
                if (row.id && row.json) {
                    parseCsvDataFn(row, responseArray);
                }
            })
            .on("error", function (error) {
                throw error.message;
            }).on("end", function () {
                getCsvFn(responseArray);
            });
    } catch (error) {
        // console.error(error)
    }
}

/**
 * Parses CSV Data and performs the rotation, adds the output to reponse array for CSV generation
 * @param {*} row 
 * @param {*} responseArray 
 */
const parseCsvDataFn = (row, responseArray) => {
    const index = row.id;
    const tableArray = JSON.parse(row.json);
    let rotatedArray = [];
    let isCompatible = true;
    if (tableArray.length === 1) { // checks length of provided array and if length is 1, it can be considered rotated.
        rotatedArray = tableArray;
    } else {
        // Break point of array to construct matrix, 
        // if value is lesser than / equal to 1 valid multi row matrix cannot be constructed
        const colCount = Math.floor(Math.sqrt(tableArray.length));
        if (colCount > 1) {
            const matrix = convertArrayToMatrixFn(tableArray, colCount);
            // checks whether matrix formed is valid and compatible for rotation.
            isCompatible = matrix.findIndex(el => el.length != colCount) === -1
            if (isCompatible) {
                const rMatrix = rotateMatrixFn(matrix);
                rotatedArray = rMatrix.flatMap((row) => row);
            }
        } else {
            isCompatible = false;
        }
    }
    responseArray.push({ id: index, json: JSON.stringify(rotatedArray), is_valid: isCompatible })
}


/**
 * Function to convert array to matrix
 * @param {*} arrayElements array that needs to be converted into Matrix
 * @param {*} columnsCount number of columns for each row in the array
 * @returns matrix form of the provided array
 */
const convertArrayToMatrixFn = (arrayElements, columnsCount) => {
    const matrix = [];
    let mIndex = -1;
    arrayElements.forEach((elem, idx) => {
        if (idx % columnsCount === 0) {
            mIndex++;
            matrix[mIndex] = [];
        }
        matrix[mIndex].push(elem);
    });
    return matrix;
}



/**
 * Rotates the matrix by single move
 * @param {*} matrix 
 * @returns rotated matrix
 */
const rotateMatrixFn = (matrix) => {
    let top = 0;
    let bottom = matrix.length - 1;
    let left = 0;
    let right = matrix[0].length - 1;

    while (left < right && top < bottom) {
        let prev = matrix[top + 1][left];
        // move each element of the top row to next position and hold the last element for right transitions
        for (let index = left; index < right + 1; index++) {
            const curr = matrix[top][index];
            matrix[top][index] = prev;
            prev = curr;
        }
        top += 1;
        // move each element of the right most col to below position and hold the last element for bottom transitions
        for (let index = top; index < bottom + 1; index++) {
            const curr = matrix[index][right]
            matrix[index][right] = prev;
            prev = curr;
        }
        right -= 1
        // move each element of the bottom most row towards left position and hold the last element for left transitions
        for (let index = right; index > left - 1; index--) {
            const curr = matrix[bottom][index];
            matrix[bottom][index] = prev;
            prev = curr;
        }
        bottom -= 1;
        // move each element of the left most row towards top position and hold the last element for next top transition
        for (let index = bottom; index > top - 1; index--) {
            const curr = matrix[index][left]
            matrix[index][left] = prev;
            prev = curr;
        }
        left += 1
    }

    return matrix;
}

/**
 * Takes data and generates a outstream and updates csv file
 * @param {*} formattedData data that has been processed and that needs to be displayed into CSV
 */
const getCsvFn = (formattedData) => {
    const csvStream = format({ headers: true });
    csvStream.pipe(process.stdout).on('end', () => process.exit());
    for (const iterator of formattedData) {
        csvStream.write(iterator);
    }
    csvStream.end();
}


init();