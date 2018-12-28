using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace Garden
{
    class GardenGame : Game
    {
        GraphicsDeviceManager graphics;

        SpriteFont font;

        // For drawing squares.
        BasicEffect squareEffect;

        Garden garden;

        VertexBuffer[] gardenVertices;
        IndexBuffer[] gardenIndices;

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
                if (gardenIndices == null)
                {
                    gardenIndices = new IndexBuffer[Garden.Width * Garden.Height];
                }
                if (gardenVertices == null)
                {
                    gardenVertices = new VertexBuffer[Garden.Width * Garden.Height];
                }

                for (int i = 0; i < gardenIndices.Length; i++)
                {
                    if (gardenIndices[i] != null)
                    {
                        gardenIndices[i].Dispose();
                        gardenIndices[i] = null;
                    }
                }
                for (int i = 0; i < gardenVertices.Length; i++)
                {
                    if (gardenVertices[i] != null)
                    {
                        gardenVertices[i].Dispose();
                        gardenVertices[i] = null;

                    }
                }
            }

            HandleInput();
            UpdateDebugGarbage();
        }


        const float scale = 1.0f;
        float pitch = 0.0f;
        float yaw = 0.0f;
        float zoom = 1.0f;
        Vector3 lookAt = new Vector3(
            scale * Garden.MaxWorldX / 2f,
            scale * Garden.MaxElevation / 2f,
            scale * Garden.MaxWorldZ / 2f);


        void HandleInput()
        {
            GamePadState controller = GamePad.GetState(0);
            KeyboardState keyboard = Keyboard.GetState();

            float yawDelta = 0f;
            if (controller.ThumbSticks.Right.X != 0)
            {
                // Turn left/right
                yawDelta = 0.05f * -controller.ThumbSticks.Right.X;
            }
            else if (keyboard.IsKeyDown(Keys.Right))
            {
                yawDelta = -0.05f;
            }
            else if (keyboard.IsKeyDown(Keys.Left))
            {
                yawDelta = 0.05f;
            }
            yaw += yawDelta;


            float pitchDelta = 0f;
            if (controller.ThumbSticks.Right.Y != 0)
            {
                // Turn up/down
                pitchDelta = 0.05f * -controller.ThumbSticks.Right.Y;
            }
            else if (keyboard.IsKeyDown(Keys.Up))
            {
                pitchDelta = 0.05f;
            }
            else if (keyboard.IsKeyDown(Keys.Down))
            {
                pitchDelta = -0.05f;
            }
            if (pitchDelta != 0)
            {
                float pitch = this.pitch;
                pitch += pitchDelta;
                if (pitch > (float)Math.PI / 2.0f) { pitch = (float)Math.PI / 2.0f; }
                if (pitch < 0.0f) { pitch = 0.0f; }
                this.pitch = pitch;
            }

            Vector2 movement = controller.ThumbSticks.Left;
            if (keyboard.IsKeyDown(Keys.A))
            {
                movement.X = -2.0f;
            }
            if (keyboard.IsKeyDown(Keys.D))
            {
                movement.X = 2.0f;
            }
            if (keyboard.IsKeyDown(Keys.W))
            {
                movement.Y = 2.0f;
            }
            if (keyboard.IsKeyDown(Keys.S))
            {
                movement.Y = -2.0f;
            }
            if (movement != Vector2.Zero)
            {
                Vector3 forward = Vector3.Transform(
                    Vector3.UnitX,
                    Matrix.CreateFromAxisAngle(Vector3.UnitY, this.yaw));
                Vector3 right = Vector3.Cross(forward, Vector3.UnitY);

                lookAt += forward * movement.Y;
                lookAt += right * movement.X;
            }

            if (controller.Triggers.Right >= 0.5)
            {
                this.zoom = 0.25f;
            }
            if (controller.Triggers.Left >= 0.5)
            {
                this.zoom = 1.0f;
            }
        }

        Matrix RecomputeProjection() =>
            Matrix.CreatePerspectiveFieldOfView(
                fieldOfView: zoom * (float)Math.PI / 4.0f,
                aspectRatio: GraphicsDevice.Viewport.AspectRatio,
                nearPlaneDistance: 0.1f,
                farPlaneDistance: 1000f);


        string cameraDebug = "";

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

            cameraDebug =
                $"f:{forward.Length():0.00} u:{up.Length():0.00} " +
                $"r:{right.Length():0.00}";
            return Matrix.CreateLookAt(cameraPosition, lookAt, up);
        }

        static IndexBuffer BuildChunkIndexBuffer(GraphicsDevice device, GardenChunk chunk)
        {
            int cursor = 0;

            int indexCount =
                (GardenChunk.Width - 1) * (GardenChunk.Height - 1) * 6;
            short[] indices = new short[indexCount];
            for (int y = 0; y < GardenChunk.Height - 1; y++)
            {
                for (int x = 0; x < GardenChunk.Width - 1; x++)
                {
                    indices[cursor + 0] = (short)GardenChunk.Index(x + 0, y + 1);
                    indices[cursor + 1] = (short)GardenChunk.Index(x + 0, y + 0);
                    indices[cursor + 2] = (short)GardenChunk.Index(x + 1, y + 1);

                    indices[cursor + 3] = (short)GardenChunk.Index(x + 1, y + 1);
                    indices[cursor + 4] = (short)GardenChunk.Index(x + 0, y + 0);
                    indices[cursor + 5] = (short)GardenChunk.Index(x + 1, y + 0);

                    cursor += 6;
                }
            }
            var gardenIndices = new IndexBuffer(
                device,
                typeof(short),
                indices.Length,
                BufferUsage.WriteOnly);
            gardenIndices.SetData(indices);
            return gardenIndices;
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            // SpriteBatch disables the depth buffer; turn it back on again.
            GraphicsDevice.DepthStencilState = DepthStencilState.Default;

            squareEffect.View = RecomputeView();
            squareEffect.Projection = RecomputeProjection();
            squareEffect.VertexColorEnabled = true;

            for (int wy = 0; wy < Garden.Height; wy++)
            {
                for (int wx = 0; wx < Garden.Width; wx++)
                {
                    DrawChunk(wx, wy);
                }
            }

            DrawDebugGarbage(gameTime);
        }

        void DrawChunk(int wx, int wy)
        {
            int ci = Garden.Index(wx, wy);

            IndexBuffer indexBuffer = gardenIndices[ci];
            if (indexBuffer == null)
            {
                indexBuffer = gardenIndices[ci] = BuildChunkIndexBuffer(
                    GraphicsDevice, garden.Chunks[ci]);
            }
            GraphicsDevice.Indices = indexBuffer;

            VertexBuffer vertexBuffer = gardenVertices[ci];
            if (vertexBuffer == null)
            {
                GardenChunk chunk = garden.Chunks[ci];
                VertexPositionColor[] vertices = chunk.Vertices;
                vertexBuffer = gardenVertices[ci] = new VertexBuffer(
                    GraphicsDevice,
                    typeof(VertexPositionColor),
                    vertices.Length,
                    BufferUsage.WriteOnly);
                gardenVertices[ci].SetData(vertices);
            }
            GraphicsDevice.SetVertexBuffer(vertexBuffer);

            squareEffect.World = Matrix.CreateTranslation(
                wx * (GardenChunk.Width - 1),
                0,
                wy * (GardenChunk.Height - 1));
            foreach (EffectPass pass in squareEffect.CurrentTechnique.Passes)
            {
                pass.Apply();
                GraphicsDevice.DrawIndexedPrimitives(
                    primitiveType: PrimitiveType.TriangleList,
                    baseVertex: 0,
                    startIndex: 0,
                    primitiveCount: indexBuffer.IndexCount / 3);
            }
        }

        int dbgi_x = 0;
        int dbgi_y = 0;

        void UpdateDebugGarbage()
        {
            GamePadState state = GamePad.GetState(0);
            if (state.IsButtonDown(Buttons.DPadDown)) { dbgi_y++; }
            if (state.IsButtonDown(Buttons.DPadUp)) { dbgi_y--; }
            if (state.IsButtonDown(Buttons.DPadLeft)) { dbgi_x++; }
            if (state.IsButtonDown(Buttons.DPadRight)) { dbgi_x--; }
            dbgi_x = MathHelper.Clamp(dbgi_x, 0, GardenChunk.Width - 1);
            dbgi_y = MathHelper.Clamp(dbgi_y, 0, GardenChunk.Height - 1);
        }

        void DrawDebugGarbage(GameTime gameTime)
        {
            var fps = 1.0 / gameTime.ElapsedGameTime.TotalSeconds;

            var dbgi = GardenChunk.Index(dbgi_x, dbgi_y);
            var dbg = garden.Chunks[0].Vertices[dbgi];

            var cat = (squareEffect.World * squareEffect.View * squareEffect.Projection);
            var p2 = Vector4.Transform(new Vector4(dbg.Position, 1), cat);
            var pp = GraphicsDevice.Viewport.Project(
                dbg.Position,
                squareEffect.Projection,
                squareEffect.View,
                squareEffect.World);

            var spriteBatch = new SpriteBatch(GraphicsDevice);
            spriteBatch.Begin();
            spriteBatch.DrawString(
                font,
                $"{fps:0.00} {zoom:0.00} {yaw:0.00} {dv(dbg.Position)} " +
                $"{dv(p2)} {dv(pp)}",
                new Vector2(10, 10),
                Color.White);

            Vector2 xp = new Vector2(pp.X - 6, pp.Y - 6);
            spriteBatch.DrawString(font, "X", xp, Color.White);
            spriteBatch.End();
        }

        static string dv(Vector3 v) => $"[{v.X:0.000} {v.Y:0.000} {v.Z:0.000}]";

        static string dv(Vector4 v) =>
            $"[{v.X:0.000} {v.Y:0.000} {v.Z:0.000} {v.W:0.000}]";
    }

}
