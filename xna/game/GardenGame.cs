using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace Garden
{
    class Garden
    {
        public const int Width = 256;
        public const int Height = 256;

        VertexPositionColor[] vertices;

        public Garden(ref VertexPositionColor[] vertices)
        {
            this.vertices = vertices;
            vertices = null;
        }

        public VertexPositionColor[] Vertices => this.vertices;

        public float Elevation(int x, int y) =>
            this.vertices[y * Width + x].Position.Z;

        public static Garden Generate()
        {
            var vertices = new VertexPositionColor[Width * Height];
            int i = 0;
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    float nx = ((float)x / (float)Width) - 0.5f;
                    float ny = ((float)y / (float)Height) - 0.5f;

                    float z = SimplexNoise.Generate(7 * nx, 7 * ny);

                    Color color = Color.White * z;
                    color.A = 255;
                    vertices[i] = new VertexPositionColor(
                        new Vector3(x, y, z),
                        color);
                    i += 1;
                }
            }
            return new Garden(ref vertices);
        }
    }

    class GardenGame : Game
    {
        GraphicsDeviceManager graphics;

        SpriteFont font;

        // For drawing squares.
        BasicEffect squareEffect;

        Garden garden;

        VertexBuffer gardenVertices;
        IndexBuffer gardenIndices;

        public GardenGame()
        {
            graphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "content";
        }

        protected override void LoadContent()
        {
            font = Content.Load<SpriteFont>("fonts/basic");

            squareEffect = new BasicEffect(GraphicsDevice);
        }

        protected override void UnloadContent()
        {
            font = null;
        }

        protected override void Update(GameTime gameTime)
        {
            if (garden == null)
            {
                garden = Garden.Generate();
                if (gardenIndices != null)
                {
                    gardenIndices.Dispose();
                    gardenIndices = null;
                }
                if (gardenVertices != null)
                {
                    gardenVertices.Dispose();
                    gardenVertices = null;
                }
            }
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            squareEffect.Alpha = 0.50f;
            squareEffect.View = Matrix.CreateLookAt(
                new Vector3(Garden.Width / 2, Garden.Height / 2, 10),
                new Vector3(Garden.Width / 2, Garden.Height / 2, 0),
                new Vector3(0, 1, 0));// * Matrix.CreateScale(50);
            squareEffect.Projection = Matrix.CreateOrthographic(
                (float)GraphicsDevice.Viewport.Width,
                (float)GraphicsDevice.Viewport.Height,
                0f,
                1000.0f);
            squareEffect.LightingEnabled = false;
            squareEffect.VertexColorEnabled = true;

            if (gardenIndices == null)
            {
                gardenIndices = new IndexBuffer(
                    GraphicsDevice,
                    typeof(short),
                    Garden.Width * 2,
                    BufferUsage.WriteOnly);

                short[] indices = new short[Garden.Width * 2];
                for (short x = 0; x < Garden.Width; x++)
                {
                    indices[(x * 2) + 0] = x;
                    indices[(x * 2) + 1] = (short)(x + Garden.Width);
                }
                gardenIndices.SetData(indices);
            }

            if (gardenVertices == null)
            {
                VertexPositionColor[] vertices = garden.Vertices;
                gardenVertices = new VertexBuffer(
                    GraphicsDevice,
                    typeof(VertexPositionColor),
                    vertices.Length,
                    BufferUsage.WriteOnly);
                gardenVertices.SetData(vertices);
            }

            // Indices describes a strip of triangles that makes up one row of
            // terrain. We can re-use these indices for each row of terrain by
            // shifting the vertex offset along...
            GraphicsDevice.Indices = gardenIndices;
            for (int y = 0; y < Garden.Height - 1; y++)
            {
                GraphicsDevice.SetVertexBuffer(gardenVertices);
                foreach (EffectPass pass in squareEffect.CurrentTechnique.Passes)
                {
                    pass.Apply();
                    GraphicsDevice.DrawIndexedPrimitives(
                        primitiveType: PrimitiveType.TriangleStrip,
                        baseVertex: y * Garden.Width,
                        startIndex: 0,
                        primitiveCount: Garden.Width * 2);
                }
            }


            var fps = 1.0 / gameTime.ElapsedGameTime.TotalSeconds;

            var spriteBatch = new SpriteBatch(GraphicsDevice);
            spriteBatch.Begin();
            spriteBatch.DrawString(
                font,
                String.Format("{0} fps", fps),
                new Vector2(10, 10),
                Color.White);
            spriteBatch.End();
        }
    }

}
