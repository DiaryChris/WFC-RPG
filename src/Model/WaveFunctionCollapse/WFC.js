import * as Constraints from "./Constraints/Constraints"

export function WFC(periodic, width, height, tileset_info) {
    let data = tileset_info["data"];
    
    let tile_data = GenerateTileData(data, width, height);
    let neighbor_propagator = tile_data["neighbor_propagator"]; //TODO: this is dumb
    let tile_amount = tile_data.tiles.amount;
    let item_amount = tile_data.items.amount;

    let data_to_observe = ["tiles", "items"]
    let wave = GenerateWave(tile_amount, item_amount, width, height);
    
    let tiles_to_remove = [];
    let result = null;
    let definite_state = 0;
    
    Clear(wave, tile_amount, tile_data);
    
    while (result == null) {
        
        // result = Observe(wave, tile_data, tile_amount, tiles_to_remove, periodic, width, height);
        for (elem of data_to_observe) {
            let elem_data = tile_data[elem]
            let elems_to_remove = []
            result = Observe_Wave_Elem(wave, elem_data, elem, elems_to_remove, periodic, width, height);
            if (result) {
                definite_state++;
            }
            Propagate_Wave_Elem(wave, elems_to_remove, periodic, width, height, elem_data, neighbor_propagator)
            debugger
        }
        if (definite_state == data_to_observe.length) {
            let tiles = tile_data["tiles"].names
            let items = tile_data["items"].names
            return GenerateTileMap(wave, tile_amount, item_amount, tiles, items, width, height)
        }
        // if (result) {
        //     let tiles = tile_data["tiles"].names
        //     let items = tile_data["items"].names
        //     return GenerateTileMap(wave, tile_amount, item_amount, tiles, items, width, height)
        // }
        // Propagate(wave, tiles_to_remove, periodic, width, height, tile_data);
    }
    
}
function Clear(wave, tile_amount, tile_data) {
    let opposite = [2, 3, 0, 1];
    let tiles = tile_data.tiles;
    let items = tile_data.items;
    for (let i = 0; i < wave.length; i++) {
        for (let t = 0; t < tile_amount; t++) {
            wave[i]["tiles"][t] = true;
        }
    }
    for (let w = 0; w < wave.length; w++) {
        for (let t = 0; t < tile_amount; t++) {
            for (let d = 0; d < 4; d++) {
                tiles.compatible[w][t][d] = tile_data.neighbor_propagator[opposite[d]][t].length; // compatible is the compatible tiles of t. NOT t itself. Which is why opposite is involved.
            }
        }
    }
    for (let t = 0; t < wave.length; t++) {
        tiles.possible_choices[t] = tiles.weights.length;
        tiles.sums_of_weights[t] = tiles.sum_of_weights;
        tiles.sums_of_log_weights[t] = tiles.sum_of_log_weights;
        tiles.entropies[t] = tiles.starting_entropy;

        items.possible_choices[t] = items.weights.length;
        items.sums_of_weights[t] = items.sum_of_weights;
        items.sums_of_log_weights[t] = items.sum_of_log_weights;
        items.entropies[t] = items.starting_entropy;
    }
}
function GenerateTileMap(wave, tile_amount, item_amount, tiles, items, width, height) {
    let array = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let tile_elem = wave[x + y * height]["tiles"];
            let item_elem = wave[x + y * height]["items"];
            let amount = 0;
            for (let i = 0; i < tile_elem.length; i++) {
                if (tile_elem[i]) {
                    amount += 1;
                }
            }
            if (amount == tile_amount) {
                console.warn(amount)
            } else {
                for (let t = 0; t < tile_amount; t++) {
                    if (tile_elem[t]) {
                        for (let i = 0; i < item_amount; i++) {
                            if (item_elem[i]) {
                                array.push(tiles[t] + ' ' + items[i]);
                            }
                        }
                    }
                }
            }
        } 
    }
    debugger
    return array;
}
/**
 * GenerateTileData
 *  Takes data and converts data into something that WFC can read.
 * @param {array} data 
 * @returns {object} subsets
 */
function GenerateTileData(data, width, height) {
    let tiles = Constraints.GenerateTiles(data["tiles_info"], width, height);
    let items = Constraints.GenerateItems(data["items_info"], width, height);
    let rules = Constraints.GenerateRules(data["rules_info"])
    let neighbors = data["neighbors"].length != 0 ? data["neighbors"] :
                    Constraints.GetNeighbors(tiles)
    let neighbor_propagator = GeneratePropagator(neighbors, tiles, items)
    let tile_data = {
        "tiles": tiles,
        "items": items,
        "rules": rules,
        "neighbors": neighbors,
        "neighbor_propagator": neighbor_propagator
    }
    return tile_data;
}
/**
 * GeneratePropagator
 * @param {*} neighbors 
 * @param {*} tiles 
 * @param {*} items 
 * Returns a matrix of possible neighboring tiles.
 * @returns {object} locality_propagator    
 */
function GeneratePropagator(neighbors, tiles, items) {
    let sparse_propagator;
    let neighbor_pair;
    let left, right, L_ID, R_ID, L, R, D, U;

    let neighbor_tiles = neighbors.tiles;

    let locality_propagator = new Array(4)
    let propagator = new Array(4);
    
    let tile_names = tiles["names"];

    for (let d = 0; d < 4; d++) { // d is for direction.
        locality_propagator[d] = new Array(tile_names.length); // all the tiles. We are reaching that superposition stuff
        propagator[d] = new Array(tile_names.length); // all the tiles. We are reaching that superposition stuff
        for (let t = 0; t < tile_names.length; t++) {
            locality_propagator[d][t] = new Array(tile_names.length); // This will be the bool array. Since each tile should know what it's possible neighbor tile is.
            propagator[d][t] = new Array(tile_names.length).fill(false); // This will be the bool array. Since each tile should know what it's possible neighbor tile is.
        }
    }
    for (let i = 0; i < neighbor_tiles.length; i++) {
        neighbor_pair = neighbor_tiles[i];
        left = neighbor_pair.left
        right = neighbor_pair.right
        L_ID = tiles["IDs"][left];
        R_ID = tiles["IDs"][right]
        L = tiles["rotations"][L_ID];
        R = tiles["rotations"][R_ID];
        D = tiles["rotations"][L[1]];
        U = tiles["rotations"][R[1]];
        
        propagator[0][R[0]][L[0]] = true;
        propagator[0][R[6]][L[6]] = true;
        propagator[0][L[4]][R[4]] = true;
        propagator[0][L[2]][R[2]] = true;

        propagator[1][U[0]][D[0]] = true;
        propagator[1][D[6]][U[6]] = true;
        propagator[1][U[4]][D[4]] = true;
        propagator[1][D[2]][U[2]] = true;
    }
    for (let t = 0; t < tile_names.length; t++) {
        for (let t2 = 0; t2 < tile_names.length; t2++) {
            propagator[2][t][t2] = propagator[0][t2][t];
            propagator[3][t][t2] = propagator[1][t2][t];
        }
    }
    sparse_propagator = new Array(4);
    for (let d = 0; d < 4; d++) {
        sparse_propagator[d] = new Array(4);
        for (let t = 0; t < tile_names.length; t++) {
            sparse_propagator[d][t] = [];
        }
    }
    for (let d = 0; d < 4; d++) {
        for (let t = 0; t < tile_names.length; t++) {
            let sp = sparse_propagator[d][t];
            let p = propagator[d][t]

            for (let t1 = 0; t1 < tile_names.length; t1++) {
                if (p[t1]) {
                    sp.push(t1);
                }
            }
            locality_propagator[d][t] = sp;
        }
    }
    return locality_propagator;
}
/**
 * GenerateWave
 * @param {*} tile_amount 
 * @param {*} item_amount 
 * @param {*} width 
 * @param {*} height
 * @returns matrix with each element being a true boolean array size of tiles. 
 */
function GenerateWave(tile_amount, item_amount, width, height) {
    let wave = new Array(width * height)
    for (let i = 0; i < width * height; i++) {
        wave[i] = {
            "tiles" : new Array(tile_amount).fill(true),
            "items" : new Array(item_amount).fill(true)
        }
    }
    return wave;
}

function Observe_Wave_Elem(wave, elem_data, elem, elems_to_remove, periodic, width, height) {
    let noise, entropy, possiblities;
    let min = 1000;
    let argmin = -1;
    let chosen_elem = -1;
    
    for (let i = 0; i < wave.length; i++) {
        if (OnBoundary(i % width, i / width, periodic, width, height)) {
            continue;
        }
        possiblities = elem_data.possible_choices[i];
        if (possiblities == 0) {
            return false;
        }
        entropy = elem_data.entropies[i];
        if (possiblities > 1 && entropy <= min) {
            // let noise = 0.000001 * this.random();
            noise = 0.000001;
            if (entropy + noise < min) {
                min = entropy + noise;
                argmin = i;
            }
        }
    }
    if (argmin == -1) {
        debugger //TODO: ENTROPY IS LOWER THAN WHAT IT SHOULD BE.
        return true;
    }
    let distribution = new Array(elem_data.amount);
    let w = wave[argmin][elem];
    
    for (let t = 0; t < elem_data.amount; t++) {
        distribution[t] = w[t] ? elem_data.weights[t] : 0;
        distribution[t] /= elem_data.amount;
    }
    let r = _NonZeroIndex(distribution);
    
    for (let t = 0; t < elem_data.amount; t++) {
        if (w[t] != (t == r)) {
            elems_to_remove = Ban(wave, elem_data, elem, argmin, t, elems_to_remove);
            
            // tiles_to_remove = BanTile(wave, tiles_info, argmin, t, tiles_to_remove);
        } else {
            chosen_elem = t;
        }
    }
    console.log(elem_data.names[chosen_elem])
    return null;
}


function Observe(wave, tile_data, tile_amount, tiles_to_remove, periodic, width, height) {
    let noise, amount, entropy;
    let min = 1000;
    let argmin = -1;
    let tiles_info = tile_data["tiles"];
    let tile_chosen = -1;
    
    for (let i = 0; i < wave.length; i++) {
        if (OnBoundary(i % width, i / width, periodic, width, height)) {
            continue;
        }
        amount = tiles_info.possible_choices[i];
        if (amount == 0) {
            return false;
        }
        entropy = tiles_info.entropies[i];
        if (amount > 1 && entropy <= min) {
            // let noise = 0.000001 * this.random();
            noise = 0.000001;
            if (entropy + noise < min) {
                min = entropy + noise;
                argmin = i;
            }
        }
    }
    if (argmin == -1) {
        // let observed = new Array(width * height);
        // for (let i = 0; i < wave.length; i++) {
        //     for (let t = 0; t < tile_amount; t++) {
        //         let wave_tiles = wave[i]["tiles"]
        //         if (wave_tiles[t]) {
        //             observed[i] = t;
        //             break;
        //         }
        //     }
        // }
        debugger
        return true;
    }
    let distribution = new Array(tiles_info.amount);
    let w = wave[argmin]["tiles"];

    for (let t = 0; t < tiles_info.amount; t++) {
        distribution[t] = w[t] ? tiles_info.weights[t] : 0;
        distribution[t] /= tiles_info.amount;
    }
    let r = _NonZeroIndex(distribution);

    for (let t = 0; t < tiles_info.amount; t++) {
        if (w[t] != (t == r)) {
            tiles_to_remove = BanTile(wave, tiles_info, argmin, t, tiles_to_remove);
            let items_info = tile_data["items"];
            
            // thing_to_remove = Ban(wave, info, info_type, argmin, t, thing_to_remove);

            // items_to_remove = BanItem(wave, items_info, argmin, null, null);
            BanItem(wave, items_info, argmin, null, null);
        } else {
            tile_chosen = t;
        }
    }
    console.log(tiles_info.names[tile_chosen])
    return null;
}

function Propagate_Wave_Elem(wave, elems_to_remove, periodic, width, height, elem_data, neighbor_propagator) {
    let DX = [-1, 0, 1, 0];
    let DY = [0, 1, 0, -1];
    if (elem_data.compatible == undefined) {
        return [];
    }
    while(elems_to_remove.length > 0) {
        let e1 = elems_to_remove.pop(); // element 1

        let index_1 = e1[0]; // Item 1
        let tile_1 = e1[1];
        let x1 = index_1 % width;
        let y1 = Math.floor(index_1 / width);
        
        for (let d = 0; d < 4; d++) {
            let dx = DX[d]; 
            let dy = DY[d];
            let x2 = x1 + dx;
            let y2 = y1 + dy;

            if (OnBoundary(x2, y2, periodic, width, height)) {
                continue;
            }
            if (x2 < 0) {
                x2 += width;
            } else if (x2 >= width) {
                x2 -= width;
            }

            if (y2 < 0) {
                y2 += height;
            } else if (y2 >= height) {
                y2 -= height;
            }

            let index_2 = x2 + y2 * width;  // Item 2
            let p = neighbor_propagator[d][tile_1];
            let compat = elem_data.compatible[index_2];
            for (let l = 0; l < p.length; l++) {
                let tile_2 = p[l] 
                let comp = compat[tile_2];
                comp[d] = comp[d] - 1;
                if (comp[d] == 0) {
                    elems_to_remove = Ban(wave, elem_data, elem,  index_2, tile_2, elems_to_remove);
                }
            }
        }
    }
    return elems_to_remove
}

function Propagate(wave, tile_array, periodic, width, height, tile_data) {
    let DX = [-1, 0, 1, 0];
    let DY = [0, 1, 0, -1];
    
    let tiles_info = tile_data["tiles"];
    while(tile_array.length > 0) {
        let e1 = tile_array.pop(); // element 1

        let index_1 = e1[0]; // Item 1
        let tile_1 = e1[1];
        let x1 = index_1 % width;
        let y1 = Math.floor(index_1 / width);
        
        for (let d = 0; d < 4; d++) {
            let dx = DX[d]; 
            let dy = DY[d];
            let x2 = x1 + dx;
            let y2 = y1 + dy;

            if (OnBoundary(x2, y2, periodic, width, height)) {
                continue;
            }

            if (x2 < 0) {
                x2 += width;
            } else if (x2 >= width) {
                x2 -= width;
            }

            if (y2 < 0) {
                y2 += height;
            } else if (y2 >= height) {
                y2 -= height;
            }

            let index_2 = x2 + y2 * width;  // Item 2
            let p = tile_data.neighbor_propagator[d][tile_1];
            let compat = tiles_info.compatible[index_2];
            for (let l = 0; l < p.length; l++) {
                let tile_2 = p[l] 
                let comp = compat[tile_2];
                comp[d] = comp[d] - 1;
                if (comp[d] == 0) {
                    tile_array = BanTile(wave, tiles_info, index_2, tile_2, tile_array);
                    let items_info = tile_data["items"];
                    BanItem(wave, items_info, index_2, null, null)
                }
            }
        }
    }
    return tile_array
}
function BanTile(wave, tiles_info, elem, tile, tiles_to_remove) {
    let tile_amount = tiles_info.amount;
    let wave_tile_array = wave[elem]["tiles"];
    for (let i = tile_amount; i < wave_tile_array.length; i++) {
        wave_tile_array[i] = false;
    }
    wave_tile_array[tile] = false;
    tiles_info.compatible[elem][tile] = [0,0,0,0];

    tiles_to_remove.push([elem, tile]);
    let sum = tiles_info.sums_of_weights[elem];
    tiles_info.entropies[elem] += tiles_info.sums_of_log_weights[elem] / sum - Math.log(sum);

    tiles_info.possible_choices[elem] -= 1;
    tiles_info.sums_of_weights[elem] -= tiles_info.weights[tile];
    tiles_info.sums_of_log_weights[elem] -= tiles_info.log_weights[tile];

    sum = tiles_info.sums_of_weights[elem];
    tiles_info.entropies[elem] -= tiles_info.sums_of_log_weights[elem] / sum - Math.log(sum);

    return tiles_to_remove;
}


function Ban(wave, elem_data, elem, wave_elem, index, elems_to_remove) {
    let amount = elem_data.amount;
    let wave_tile_array = wave[wave_elem][elem];
    for (let i = amount; i < wave_tile_array.length; i++) {
        wave_tile_array[i] = false;
    }
    wave_tile_array[elem] = false;
    if (elem_data.compatible != undefined) {
        elem_data.compatible[wave_elem][index] = [0,0,0,0];
    }

    elems_to_remove.push([wave_elem, index]);
    let sum = elem_data.sums_of_weights[wave_elem];
    elem_data.entropies[wave_elem] += elem_data.sums_of_log_weights[wave_elem] / sum - Math.log(sum);

    elem_data.possible_choices[wave_elem] -= 1;
    elem_data.sums_of_weights[wave_elem] -= elem_data.weights[elem];
    elem_data.sums_of_log_weights[wave_elem] -= elem_data.log_weights[elem];

    sum = elem_data.sums_of_weights[wave_elem];
    elem_data.entropies[wave_elem] -= elem_data.sums_of_log_weights[wave_elem] / sum - Math.log(sum);

    return elems_to_remove;
}

function BanItem(wave, items_info, elem, item, items_to_remove) {
    let item_amount = items_info.amount;
    let count = 0;
    let wave_item_array = wave[elem]["items"];
    for (let i = 0; i < wave_item_array.length; i++) {
        if (wave_item_array[i]) {
            count++;
        }
    }
    if (count == 1) {
        return
    }
    let index = Math.floor(Math.random()*wave_item_array.length);
    for (let i = 0; i < wave_item_array.length; i++) {
        if (i != index) {
            wave_item_array[i] = false;
        }
    }
}
function _NonZeroIndex(array) {
    let index = Math.floor(Math.random()*array.length);
    let elem = array[index];
    let zero_array = [];
    for (let i = 0; i < array.length; i++) {
        if (elem == 0) {
            zero_array.push(index);
        }
        if (zero_array.includes(index)) {
            index = Math.floor(Math.random()*array.length);
            elem = array[index];
        }
        else {
            return index;
        }
    }
}  
function OnBoundary(x, y, periodic, width, height) {
    return !periodic && (x < 0 || y < 0 || x >= width || y >= height);
}
