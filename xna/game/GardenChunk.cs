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
            float elevation = 0;

            int octaves = 3;
            float max = 0.0f;
            for (int i = 0; i < octaves; i++)
            {
                float octave = i + 1;
                float scale = 1.0f / octave;
                max += scale;
                elevation += scale * Noise(octave * nx, octave * ny);
            }

            return (elevation / max) * MaxElevation;
        }

        static float Noise(float x, float y) =>
            (SimplexNoise.Generate(x, y) + 1f) / 2f;
    }

}