"""Merge heads after knowledge uploads branch

Revision ID: merge_heads_agent_knowledge
Revises: add_mcp_fields_to_agents, 6ee1a8575943
Create Date: 2025-01-10 00:00:00
"""

from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401


# revision identifiers, used by Alembic.
revision = "merge_heads_agent_knowledge"
down_revision = ("add_mcp_fields_to_agents", "6ee1a8575943")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
