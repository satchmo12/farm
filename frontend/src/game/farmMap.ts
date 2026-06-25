import type {Land} from "../types";



export const LAND_COUNT = 24;


export const FARM_COLS = 6;
export const FARM_ROWS = 4;


export const TILE_WIDTH = 100;
export const TILE_HEIGHT = 56;
export interface RenderLand extends Land{

    id:number;

    row:number;
    col:number;


    x:number;
    y:number;

}



export function normalizeFarm(

lands:Land[]

):RenderLand[]{


return lands.map((land,index)=>{


    const row=Math.floor(index/FARM_COLS);
    const col=index%FARM_COLS;


    return{


        ...land,


        id:index,


        row,
        col,


        x:(col-row)*(TILE_WIDTH/2),

        y:(col+row)*(TILE_HEIGHT/2)


    }


})

}