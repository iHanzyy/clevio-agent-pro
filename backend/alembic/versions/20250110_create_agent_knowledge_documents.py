"""Create agent knowledge documents table

Revision ID: create_agent_knowledge_documents
Revises: merge_heads_agent_knowledge
Create Date: 2025-01-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "create_agent_knowledge_documents"
down_revision = "merge_heads_agent_knowledge"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "agent_knowledge_documents" not in existing_tables:
        op.create_table(
            "agent_knowledge_documents",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("agent_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=100), nullable=True),
            sa.Column("size_bytes", sa.Integer(), nullable=False),
            sa.Column("chunk_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("metadata_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    existing_indexes = {
        index["name"]
        for index in inspector.get_indexes("agent_knowledge_documents")
    } if "agent_knowledge_documents" in existing_tables else set()

    if "ix_agent_knowledge_documents_agent_id" not in existing_indexes:
        op.create_index(
            "ix_agent_knowledge_documents_agent_id",
            "agent_knowledge_documents",
            ["agent_id"],
        )
    if "ix_agent_knowledge_documents_user_id" not in existing_indexes:
        op.create_index(
            "ix_agent_knowledge_documents_user_id",
            "agent_knowledge_documents",
            ["user_id"],
        )


def downgrade() -> None:
    op.drop_index("ix_agent_knowledge_documents_user_id", table_name="agent_knowledge_documents")
    op.drop_index("ix_agent_knowledge_documents_agent_id", table_name="agent_knowledge_documents")
    op.drop_table("agent_knowledge_documents")
