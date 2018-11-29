import { WFC } from "../WaveFunctionCollapse/WFC";
import { SimpleTiledModel } from "../WaveFunctionCollapse/SimpleTiledModel";

/**
 * Creates tile map JSON for Tile2D
 */

// var model = new WFC(false, tileNum, tileNum, test_json);

// model parameter is an object 
/**
 * ----- WFC OUTPUT ------------
 * {
 *  "tileMap": [array of tile_id],
 *  "tileDict": [{"index":"tileName"}],
 * }
 * ----- WFC INPUT --------
 * {
 *      periodic : boolean,
 *      width : int,
 *      height : int,
 *      tile_json: {
 *          tiles : [
 *              {"name" : tile_1, symmetry: "\\"}    
 *          ],
 *          neighbors: [
 *          {left: tile_1 0, right: tile_1 1}         
 *          ]
 * },
 *      constraints : Object, 
 * }
 */


export class TileMapModel {
    constructor (subset,height, width, tileJSON) {
        this.height = height;
        this.width = width;
        this.periodic = false;
        this.subset = subset;
        this.tileJSON = tileJSON;
        // this.tileConstraints = tileConstraints;
        this.constraints = null;
        this.tileMapArray = this.getWFCModel();
        // this.tileArray = this.getTileMap();
        this.map = this.tileMapArray.GenerateTileMap(this.height, 0);
        this.tileMap = this.getTile2DJSON();
        this.tiles = this.getMap(0);
        this.items = this.getMap(1);
    }

    getWFCModel() {
        this.model = new SimpleTiledModel(this.periodic, this.subset,this.height, this.width, this.tileJSON); 
        return this.model;
    }

    // Input: int a - 0 >> array of tiles; 1 >> array of items
    // Output: [tile, tile ...]
    getMap(a) {
        var array = [];
        var elements, element, tile_number, rotation;
        switch(a) {
            case 1:
                for (let i = 0; i < this.map.length; i++){
                    elements = this.map[i];
                    element = elements.split(/[ ]+/);
                    array.push(element[a+1]);
                }
                break;
            case 0:
                for (let i = 0; i < this.map.length; i++) {
                    elements = this.map[i];
                    element = elements.split(/[ ]+/);
                    tile_number = element[a];
                    rotation = element[a+1];
                    switch (rotation) {
                        case '3':
                        array.push(tile_number + 0xA0000000);
                            break;
                        case '2':
                        array.push(tile_number + 0xC0000000);
                            break;
                        case '1':
                        array.push(tile_number + 0x60000000);
                            break;
                        case '0':
                        array.push(tile_number);
                            break;
                        default:
                        array.push(tile_number);
                            break;
                    }
                }
        }
        return array;
    }

    // Output: JSON file compatiblewith Tiled2D
    getTile2DJSON() {
        let tile2DJSON = {
            "height":this.height,
            "infinite": false,
            "layers":[
                {
                "data": this.getMap(0),
                "height":this.height,
                "name":"Tile Layer 1",
                "opacity":1,
                "type":"tilelayer",
                "visible":true,
                "width":this.width,
                "x":0,
                "y":0
                }],
            "nextobjectid":1,
            "orientation":"orthogonal",
            "renderorder":"right-down",
            "tiledversion":"1.1.6",
            "tileheight":32,
            "tilesets":[
                {
                    "columns":8,
                    "firstgid":1,
                    "image":"../../assets/tilesets/wolfsong/BlackForest_A.png",
                    "imageheight":512,
                    "imagewidth":256,
                    "margin":0,
                    "name":"Town_A",
                    "spacing":0,
                    "tilecount":128,
                    "tileheight":32,
                    "tilewidth":32
                }, 
            ],
            "tilewidth":32,
            "type":"map",
            "version":1,
            "width":this.width
        }
        return tile2DJSON; 
    }
        
}