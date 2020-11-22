/* @flow */
import twgl from 'twgl.js';
import glm from 'gl-matrix';

const NORMAL_OFFSET = 1;
const CHUNKSIZE = 32;
const CHUNK_OFFSET = CHUNKSIZE / 2;
const CHUNK_SUBDIVISIONS = 32;
const MAX_OBSTACLES = 5;
const MIN_OBSTACLE_SIZE = 0.5;
const MAX_OBSTACLE_SIZE = 3;

export type NoiseParams = {
    frequency: number,
    amplitude: number,
    persistence: number,
    lacunarity: number,
    octaves: number,
}

export type HeightMapData = {
    height: number,
    normal: Vec3,
    binormal: Vec3,
    tangent: Vec3,
}

// TODO the chunk generation logic for this should really be in a system
// not jammed into this component...
// TODO generation of heightmap values should also happen in a webworker if possible
// so as to not jam the main thread
export default class GroundComponent {
    static Type: string = 'GROUND_COMPONENT';
    getType(): string { return GroundComponent.Type; }

    chunks: [];
    vertices: any;
    heightMap: Array<Array<number>>;
    normalMap: Array<Array<number>>;
    bufferInfo: any;

    _gl: any;
    _noiseFunc: (x: number, y: number) => number;

    constructor(gl: any,noise: any,noiseParams: NoiseParams) {
        this._noiseFunc = this._createNoiseFunc(noise,noiseParams);

        this._gl = gl;
        this.chunks = [];
        this._createChunk(gl,-CHUNK_OFFSET,-CHUNK_OFFSET);
    }

    _createChunk(gl: any, cx: number, cz: number): void {
        // HACK sometimes ensureChunks requests that the same chunk be created a bunch of times
        // so this is here to stop that happening.. TODO find out why this happens :)
        for (let chunk of this.chunks) {
            if (chunk.boundingQuad[3] === cx && chunk.boundingQuad[0] === cz) {
                return chunk;
            }
        }

        const newChunk = {
            center: glm.vec3.fromValues(cx + CHUNK_OFFSET,0,cz + CHUNK_OFFSET),
            // stored in order of top, right, bottom, left
            boundingQuad: glm.vec4.fromValues(cz,cx + CHUNKSIZE,cz+CHUNKSIZE,cx),
            heightMap: [],
            normalMap: [],
            vertices: twgl.primitives.createPlaneVertices(
                CHUNKSIZE,
                CHUNKSIZE,
                CHUNK_SUBDIVISIONS,
                CHUNK_SUBDIVISIONS,
                null,
            ),
            obstacles: [],
        };
        console.log('Creating chunk at ',newChunk.center);
        this._createHeightMap(newChunk);
        this._spawnObstacles(newChunk);
        newChunk.bufferInfo = twgl.createBufferInfoFromArrays(gl,newChunk.vertices);
        this.chunks.push(newChunk); 
        return newChunk;
    }

    _createNoiseFunc(noise: any,noiseParams: NoiseParams): () => number {
        return (x: number,y: number) => {
            let freq = noiseParams.frequency;
            let amp = noiseParams.amplitude; 
            let value = 0;
            for (let i = 0; i < noiseParams.octaves; ++i) {
                value += noise.noise2D(x * freq,y * freq) * amp;
                freq *= noiseParams.lacunarity;
                amp *= noiseParams.persistence;
            }



            return value;
        };
    }

    _createHeightMap(chunk: any): void {
        const pos = chunk.vertices.position;
        const normal = chunk.vertices.normal;
        for (let i=0;i<pos.length;i+=3) {
            const x = pos[i] + chunk.center[0];
            const z = pos[i+2] + chunk.center[2];
            const y = this._noiseFunc(x,z);
            pos[i+1] = y;

            const norm = this._cacheHeightMap(chunk,x,y,z);
            normal[i] = norm[0];
            normal[i+1] = norm[1];
            normal[i+2] = norm[2];
        }
    }

    _spawnObstacles(chunk: any): void {
        const obstacleCount = Math.floor(Math.random() * MAX_OBSTACLES);
        for (let i = 0; i < obstacleCount;++i) {
            const x = chunk.boundingQuad[3] + MAX_OBSTACLE_SIZE + Math.floor(Math.random() * (CHUNKSIZE - (2 * MAX_OBSTACLE_SIZE)));
            const z = chunk.boundingQuad[0] + MAX_OBSTACLE_SIZE + Math.floor(Math.random() * (CHUNKSIZE - (2 * MAX_OBSTACLE_SIZE)));
            const scale = MIN_OBSTACLE_SIZE + Math.floor(Math.random() * (MAX_OBSTACLE_SIZE - MIN_OBSTACLE_SIZE));
            chunk.obstacles.push({
                position: glm.vec3.fromValues(
                    x,
                    this._getHeightAndNormalAt(chunk,x,z).height,
                    z
                ),
                size: glm.vec3.fromValues(scale,scale,scale),
            });
        }
    }

    getActiveChunk(x: number, z: number) {
        for (let chunk of this.chunks) {
            if (x >= chunk.boundingQuad[3] && 
                x < chunk.boundingQuad[1] &&
                z >= chunk.boundingQuad[0] &&
                z < chunk.boundingQuad[2]) {
                return chunk;
            }
        }
        return null;
    }

    getChunkCenter(x: number, z: number) {
        return glm.vec2.fromValues(
           Math.floor(((x < 0 ? Math.floor(x) : Math.ceil(x)) + CHUNK_OFFSET)/CHUNKSIZE) * CHUNKSIZE,
           Math.floor(((z < 0 ? Math.floor(z) : Math.ceil(z)) + CHUNK_OFFSET)/CHUNKSIZE) * CHUNKSIZE,
        );
    }

    _lookupHeightMap(chunk: any, x: number, z: number) {
        if (chunk.heightMap[x] && chunk.heightMap[x][z] != null) {
            return chunk.heightMap[x][z];
        } else {
            const y = this._noiseFunc(x,z);
            this._cacheHeightMap(chunk,x,y,z);
            if (!chunk.heightMap[x])             
            return y;
        }
    }

    _cacheHeightMap(chunk: any, x: number, y: number, z: number) {

        const s1 = glm.vec3.create();
        const s2 = glm.vec3.create();
        const s3 = glm.vec3.create();
        const s4 = glm.vec3.create();
        const s5 = glm.vec3.create();
        const s6 = glm.vec3.create();
        const s7 = glm.vec3.create();
        const s8 = glm.vec3.create();
        const norm = glm.vec3.create();

        // now calculate the normal at this point on the heightmap
        glm.vec3.set(
            s1,
            x,
            this._noiseFunc(x,z - NORMAL_OFFSET),
            z - NORMAL_OFFSET,
        );
        glm.vec3.set(
            s2,
            x,
            this._noiseFunc(x,z + NORMAL_OFFSET),
            z + NORMAL_OFFSET,
        );
        glm.vec3.set(
            s3,
            x - NORMAL_OFFSET,
            this._noiseFunc(x - NORMAL_OFFSET,z),
            z,
        );
        glm.vec3.set(
            s4,
            x + NORMAL_OFFSET,
            this._noiseFunc(x + NORMAL_OFFSET,z),
            z,
        );
        // the 0.7 is ~ sqrt(2), this means diagonal samples
        // are approx the same distance from samples taken
        // in cardinal directions
        glm.vec3.set(
            s5,
            x - NORMAL_OFFSET * 0.7,
            this._noiseFunc(x - NORMAL_OFFSET * 0.7,z - NORMAL_OFFSET * 0.7),
            z - NORMAL_OFFSET * 0.7,
        );
        glm.vec3.set(
            s6,
            x+ NORMAL_OFFSET * 0.7,
            this._noiseFunc(x + NORMAL_OFFSET * 0.7,z + NORMAL_OFFSET * 0.7),
            z + NORMAL_OFFSET * 0.7,
        );
        glm.vec3.set(
            s7,
            x - NORMAL_OFFSET * 0.7,
            this._noiseFunc(x - NORMAL_OFFSET * 0.7,z + NORMAL_OFFSET * 0.7),
            z + NORMAL_OFFSET * 0.7,
        );
        glm.vec3.set(
            s8,
            x + NORMAL_OFFSET * 0.7,
            this._noiseFunc(x + NORMAL_OFFSET * 0.7,z - NORMAL_OFFSET * 0.7),
            z - NORMAL_OFFSET * 0.7,
        );

        glm.vec3.sub(s1,s2,s1);
        glm.vec3.sub(s2,s4,s3);
        glm.vec3.sub(s5,s6,s5);
        glm.vec3.sub(s6,s8,s7);

        glm.vec3.cross(s1,s1,s2);
        glm.vec3.cross(s5,s5,s6);

        glm.vec3.normalize(
            norm,
            glm.vec3.add(norm,s1,s5),
        );

        if (!chunk.heightMap[x]) {
            chunk.heightMap[x] = [];
            chunk.normalMap[x] = [];
        }
        chunk.heightMap[x][z] = y;
        chunk.normalMap[x][z] = norm;
        return norm;
    }

    ensureChunks(x: number, z: number, radius: number, cullRadius: number) {
        const center = glm.vec3.fromValues(x,0,z);
        for (let i = this.chunks.length-1;i >=0;--i) {
            if (glm.vec3.distance(center,this.chunks[i].center) > cullRadius) {
                console.log('Culling chunk at ',this.chunks[i].center);
                this.chunks.splice(i,1);
            }
        }

        
        // test cardinal directions
        if (!this.getActiveChunk(x - radius, z)) {
            const center = this.getChunkCenter(x - radius,z);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        if (!this.getActiveChunk(x + radius, z)) {
            const center = this.getChunkCenter(x + radius,z);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        if (!this.getActiveChunk(x, z - radius)) {
            const center = this.getChunkCenter(x,z - radius);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        if (!this.getActiveChunk(x, z + radius)) {
            const center = this.getChunkCenter(x,z + radius);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }

        // test diagonal directions
        if (!this.getActiveChunk(x - radius * 0.7, z - radius * 0.7)) {
            const center = this.getChunkCenter(x - radius * 0.7,z - radius * 0.7);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        if (!this.getActiveChunk(x + radius * 0.7, z + radius * 0.7)) {
            const center = this.getChunkCenter(x + radius * 0.7,z + radius * 0.7);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        if (!this.getActiveChunk(x + radius * 0.7, z - radius * 0.7)) {
            const center = this.getChunkCenter(x + radius * 0.7,z - radius * 0.7);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        if (!this.getActiveChunk(x - radius * 0.7, z + radius * 0.7)) {
            const center = this.getChunkCenter(x - radius * 0.7,z + radius * 0.7);
            this._createChunk(this._gl,center[0] - CHUNK_OFFSET,center[1] - CHUNK_OFFSET);
        }
        
    }

    getHeightAndNormalAt(x: number,z: number): HeightMapData {
        // find a chunk that this coordinate lies within
        let chunk = this.getActiveChunk(x,z);
        if (!chunk) return null;
        return this._getHeightAndNormalAt(chunk,x,z);
    }

    _getHeightAndNormalAt(chunk,x: number,z:number) {
        const x1 = Math.floor(x);
        const z1 = Math.floor(z);

        const x2 = x1 === x ? (x + 1) : Math.ceil(x);
        const z2 = z1 === z ? (z + 1) : Math.ceil(z);

        const xl = x - x1;
        const zl = z - z1;

        // which 3 vector triangle does our point lie in.
        let s1;
        let s2;
        let s3;
        const tangent = glm.vec3.create();
        const binormal = glm.vec3.create();
        const normal = glm.vec3.create();

        if (xl >= zl) {
            s1 = glm.vec3.fromValues(x1,this._lookupHeightMap(chunk,x1,z1),z1);
            s2 = glm.vec3.fromValues(x2,this._lookupHeightMap(chunk,x2,z1),z1);
            s3 = glm.vec3.fromValues(x2,this._lookupHeightMap(chunk,x2,z2),z2);
            glm.vec3.sub(tangent,s1,s2);
            glm.vec3.sub(binormal,s3,s2);
        } else {
            s1 = glm.vec3.fromValues(x2,this._lookupHeightMap(chunk,x2,z2),z2);
            s2 = glm.vec3.fromValues(x1,this._lookupHeightMap(chunk,x1,z2),z2);
            s3 = glm.vec3.fromValues(x1,this._lookupHeightMap(chunk,x1,z1),z1);
            glm.vec3.sub(tangent,s2,s1);
            glm.vec3.sub(binormal,s2,s3);
        }

        // get the normal to this triangle
        glm.vec3.normalize(
            tangent,
            tangent,
        );
        glm.vec3.normalize(
            binormal,
            binormal,
        );
        glm.vec3.normalize(
            normal,
            glm.vec3.cross(normal,tangent,binormal),
        );

        // calculate d to form the plane equation
        // ax + by + cz + d = 0
        // by subbing in a known value
        const d = 
            -(normal[0] * s1[0] + 
            normal[1] * s1[1] +
            normal[2] * s1[2]);

        // rearrange the plane equation to solve for the desired y
        const height = -(d + normal[0] * x + normal[2] * z) / normal[1];
        return {
            height,
            normal,
            tangent,
            binormal,
            chunk,
        };
    }
}
