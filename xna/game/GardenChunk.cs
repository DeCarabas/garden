using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace Garden
{
    class GardenChunk
    {
        VertexPositionColor[] vertices;

        public GardenChunk(VertexPositionColor[] vertices)
        {
            this.vertices = vertices;
        }

        public VertexPositionColor[] Vertices => this.vertices;
        public const int Width = 128;
        public const int Height = 128;
        public const float MaxElevation = 100f;

        public float Elevation(int x, int y) =>
            this.vertices[y * Width + x].Position.Y;

        public static int Index(int x, int y) => (y * Width) + x;

        public static GardenChunk Generate(int wx, int wy)
        {
            var vertices = new VertexPositionColor[Width * Height];
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    float elevation = GenerateElevation(
                        (float)(x + wx) / (float)Width,
                        (float)(y + wy) / (float)Height);

                    float scale = elevation / MaxElevation;
                    vertices[(y * Width) + x] = new VertexPositionColor(
                        new Vector3(x, elevation, y),
                        Color.Lerp(Color.DarkGreen, Color.White, scale));
                }
            }
            return new GardenChunk(vertices);
        }

        static float GenerateElevation(float nx, float ny)
        {
            float elevation =
                1f * Noise(nx / 4f, ny / 4f) +
                0.5f * Noise(nx, ny) +
                0.25f * Noise(2 * nx, 2 * ny) +
                0.125f * Noise(4 * nx, 4 * ny);

            const float maxnoise = (1f + 0.5f + 0.25f + 0.125f);
            elevation = (elevation / maxnoise);
            elevation = (float)Math.Pow(elevation, 4);
            return elevation * MaxElevation;
        }

        static float Noise(float x, float y) =>
            (SimplexNoise.Generate(x, y) + 1f) / 2f;
    }

}