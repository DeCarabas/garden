using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace Garden
{
    class Garden
    {
        public const int Width = 256;
        public const int Height = 256;
        public const float MaxElevation = 100f;

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
            for (int y = 0; y < Height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    float nx = (float)x / (float)Width;
                    float ny = (float)y / (float)Height;
                    float elevation = GenerateElevation(nx, ny);


                    float scale = elevation / MaxElevation;
                    Color color = Color.Lerp(Color.Black, Color.White, scale);

                    int idx = (y * Width) + x;
                    vertices[idx] = new VertexPositionColor(
                        new Vector3(x, elevation, y),
                        color);
                }
            }
            return new Garden(ref vertices);
        }

        static float GenerateElevation(float nx, float ny)
        {
            float elevation = 0;

            int octaves = 8;
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
            Norm(SimplexNoise.Generate(x, y), -1, 1);

        static float Norm(float val, float min, float max) =>
            (val - min) / (max - min);
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

            MoveCamera();
        }


        const float scale = 1.0f;
        float pitch = 0.0f;
        float yaw = 0.0f;
        float zoom = 1.0f;
        Vector3 lookAt = new Vector3(
            scale * Garden.Width / 2f,
            scale * Garden.MaxElevation / 2f,
            scale * Garden.Height / 2f);

        void MoveCamera()
        {
            GamePadState state = GamePad.GetState(0);
            if (state.ThumbSticks.Right.X != 0)
            {
                // Turn left/right
                yaw += 0.05f * -state.ThumbSticks.Right.X;
            }

            if (state.ThumbSticks.Right.Y != 0)
            {
                // Turn up/down
                float pitch = this.pitch;
                pitch += 0.05f * -state.ThumbSticks.Right.Y;
                if (pitch > (float)Math.PI / 2.0f) { pitch = (float)Math.PI / 2.0f; }
                if (pitch < 0.0f) { pitch = 0.0f; }
                this.pitch = pitch;
            }

            if (state.Triggers.Right >= 0.5)
            {
                this.zoom = 0.5f;
            }

            if (state.Triggers.Left >= 0.5)
            {
                this.zoom = 1.0f;
            }
        }

        Matrix RecomputeProjection() =>
            Matrix.CreatePerspectiveFieldOfView(
                fieldOfView: zoom * (float)Math.PI / 4.0f,
                aspectRatio: GraphicsDevice.Viewport.AspectRatio,
                nearPlaneDistance: 0.1f,
                farPlaneDistance: 10000f);

        Matrix RecomputeView()
        {
            // First, turn the angle we're turned...
            Vector3 forward = Vector3.Transform(
                Vector3.UnitX,
                Matrix.CreateFromAxisAngle(Vector3.UnitY, this.yaw));

            // Now figure out the axis we're pitched around....
            Vector3 right = Vector3.Cross(forward, Vector3.UnitY);

            // And pitch around it...
            forward = Vector3.Transform(
                forward, Matrix.CreateFromAxisAngle(right, -this.pitch));

            // And now figure out which way is up!
            Vector3 up = Vector3.Cross(right, forward);

            // The camera sits a little away from the look-at point...
            Vector3 cameraPosition = lookAt - (forward * 500.0f);

            return Matrix.CreateLookAt(cameraPosition, lookAt, up);
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            squareEffect.View = RecomputeView();
            squareEffect.Projection = RecomputeProjection();
            squareEffect.World = Matrix.CreateScale(scale);

            squareEffect.DiffuseColor = Color.White.ToVector3();
            squareEffect.LightingEnabled = false;
            squareEffect.VertexColorEnabled = true;

            if (gardenIndices == null)
            {
                short[] indices = new short[Garden.Width * 2];
                for (short x = 0; x < Garden.Width; x++)
                {
                    indices[(x * 2) + 1] = x;
                    indices[(x * 2) + 0] = (short)(x + Garden.Width);
                }
                gardenIndices = new IndexBuffer(
                    GraphicsDevice,
                    typeof(short),
                    indices.Length,
                    BufferUsage.WriteOnly);
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
            GraphicsDevice.SetVertexBuffer(gardenVertices);
            for (int y = 0; y < Garden.Height - 1; y++)
            {
                foreach (EffectPass pass in squareEffect.CurrentTechnique.Passes)
                {
                    pass.Apply();
                    GraphicsDevice.DrawIndexedPrimitives(
                        primitiveType: PrimitiveType.TriangleStrip,
                        baseVertex: y * Garden.Width,
                        startIndex: 0,
                        primitiveCount: (Garden.Width - 1) * 2);
                }
            }


            var fps = 1.0 / gameTime.ElapsedGameTime.TotalSeconds;

            var spriteBatch = new SpriteBatch(GraphicsDevice);
            spriteBatch.Begin();
            spriteBatch.DrawString(
                font,
                String.Format(
                    "{0} fps {1}",
                    fps,
                    this.zoom),
                new Vector2(10, 10),
                Color.White);
            spriteBatch.End();
        }
    }

}
