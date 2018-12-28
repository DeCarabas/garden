using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

namespace Garden
{


    class Garden
    {
        public const int Width = 256;
        public const int Height = 256;

        float[] elevations;

        public Garden(ref float[] elevations)
        {
            this.elevations = elevations;
            elevations = null;
        }

        public float Elevation(int x, int y) => elevations[y * Width + x];

        public static Garden Generate()
        {
            float[] elevations = new float[Width * Height];
            int i = 0;
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    float nx = ((float)x / (float)Width) - 0.5f;
                    float ny = ((float)y / (float)Height) - 0.5f;

                    elevations[i] = SimplexNoise.Generate(7 * nx, 7 * ny);
                    i += 1;
                }
            }
            return new Garden(ref elevations);
        }
    }

    class GardenGame : Game
    {
        GraphicsDeviceManager graphics;

        SpriteFont font;

        // For drawing squares.
        BasicEffect squareEffect;
        VertexPosition[] squareVertices;

        Garden garden;

        public GardenGame()
        {
            graphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "content";
        }

        protected override void LoadContent()
        {
            font = Content.Load<SpriteFont>("fonts/basic");

            squareEffect = new BasicEffect(GraphicsDevice);

            const float halfWidth = 0.5f;

            squareVertices = new VertexPosition[5];
            squareVertices[0] = new VertexPosition(new Vector3(-halfWidth, -halfWidth, 0));
            squareVertices[1] = new VertexPosition(new Vector3(+halfWidth, -halfWidth, 0));
            squareVertices[2] = new VertexPosition(new Vector3(+halfWidth, +halfWidth, 0));
            squareVertices[3] = new VertexPosition(new Vector3(-halfWidth, -halfWidth, 0));
            squareVertices[4] = new VertexPosition(new Vector3(-halfWidth, +halfWidth, 0));
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
            }
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            squareEffect.Alpha = 0.50f;
            squareEffect.View = Matrix.CreateLookAt(
                new Vector3(Garden.Width / 2, Garden.Height / 2, 10),
                new Vector3(Garden.Width / 2, Garden.Height / 2, 0),
                new Vector3(0, 1, 0));
            squareEffect.Projection = Matrix.CreateOrthographic(
                (float)GraphicsDevice.Viewport.Width,
                (float)GraphicsDevice.Viewport.Height,
                0f,
                1000.0f);
            squareEffect.LightingEnabled = false;

            for (int y = 0; y < Garden.Width; y++)
            {
                for (int x = 0; x < Garden.Height; x++)
                {
                    float elevation = garden.Elevation(x, y);
                    squareEffect.DiffuseColor = Color.White.ToVector3() * elevation;
                    squareEffect.World = Matrix.CreateTranslation(x, y, 0);

                    foreach (EffectPass pass in squareEffect.CurrentTechnique.Passes)
                    {
                        pass.Apply();
                        GraphicsDevice.DrawUserPrimitives(
                            primitiveType: PrimitiveType.TriangleStrip,
                            vertexData: squareVertices,
                            vertexOffset: 0,
                            primitiveCount: 3,
                            vertexDeclaration: VertexPosition.VertexDeclaration);
                    }
                }
            }


            var spriteBatch = new SpriteBatch(GraphicsDevice);
            spriteBatch.Begin();
            spriteBatch.DrawString(font, "Score", new Vector2(100, 100), Color.White);
            spriteBatch.End();
        }
    }

}
