from fastapi import APIRouter, Depends, HTTPException, Response, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.deps import (
    get_current_user,  # Changed from get_api_key_user
    get_agent_service,
    get_execution_service,
    get_auth_service,
    get_embedding_service,
)
from app.services.agent_service import AgentService
from app.services.execution_service import ExecutionService
from app.services.embedding_service import EmbeddingService
from app.services.auth_service import AuthService, DEFAULT_GOOGLE_SCOPES
from app.models import User, ExecutionStatus
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentExecuteRequest,
    AgentExecuteResponse,
    AgentCreateResponse,
)
from app.core.logging import logger

router = APIRouter()


@router.post("/", response_model=AgentCreateResponse)
async def create_agent(
    agent_data: AgentCreate,
    current_user: User = Depends(get_current_user),  # Changed
    agent_service: AgentService = Depends(get_agent_service),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Create a new agent"""
    try:
        agent = agent_service.create_agent(current_user.id, agent_data)
        logger.info("Agent created", agent_id=str(agent.id), user_id=str(current_user.id))

        google_tools = {"gmail", "google_sheets", "google_calendar"}
        requires_google_auth = bool(set(agent_data.tools or []) & google_tools)

        auth_required = False
        auth_url = None
        auth_state = None

        if requires_google_auth:
            tokens = auth_service.get_user_auth_tokens(str(current_user.id))
            has_google = any(token.service == "google" for token in tokens)
            if not has_google:
                auth_data = auth_service.create_google_auth_url(
                    str(current_user.id), DEFAULT_GOOGLE_SCOPES
                )
                auth_required = True
                auth_url = auth_data.get("auth_url")
                auth_state = auth_data.get("state")

        agent_response = AgentCreateResponse.model_validate(agent, from_attributes=True)
        agent_response = agent_response.model_copy(
            update={
                "auth_required": auth_required,
                "auth_url": auth_url,
                "auth_state": auth_state,
            }
        )

        return agent_response
    except Exception as e:
        logger.error("Failed to create agent", error=str(e), user_id=str(current_user.id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create agent: {str(e)}"
        )


@router.get("/", response_model=List[AgentResponse])
@router.get("", response_model=List[AgentResponse], include_in_schema=False)
async def get_user_agents(
    current_user: User = Depends(get_current_user),  # Changed
    agent_service: AgentService = Depends(get_agent_service)
):
    """Get all agents for the current user"""
    agents = agent_service.get_user_agents(current_user.id)
    return agents


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),  # Changed
    agent_service: AgentService = Depends(get_agent_service)
):
    """Get a specific agent"""
    agent = agent_service.get_agent(agent_id, current_user.id)
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent_data: AgentUpdate,
    current_user: User = Depends(get_current_user),  # Changed
    agent_service: AgentService = Depends(get_agent_service)
):
    """Update an agent"""
    try:
        agent = agent_service.update_agent(agent_id, current_user.id, agent_data)
        logger.info("Agent updated", agent_id=str(agent_id), user_id=str(current_user.id))
        return agent
    except Exception as e:
        logger.error("Failed to update agent", error=str(e), agent_id=str(agent_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update agent: {str(e)}"
        )


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),  # Changed
    agent_service: AgentService = Depends(get_agent_service)
):
    """Delete an agent"""
    try:
        agent_service.delete_agent(agent_id, current_user.id)
        logger.info("Agent deleted", agent_id=str(agent_id), user_id=str(current_user.id))
        return {"message": "Agent deleted successfully"}
    except Exception as e:
        logger.error("Failed to delete agent", error=str(e), agent_id=str(agent_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete agent: {str(e)}"
        )


@router.post("/{agent_id}/execute", response_model=AgentExecuteResponse)
async def execute_agent(
    agent_id: UUID,
    execute_data: AgentExecuteRequest,
    current_user: User = Depends(get_current_user),  # Changed
    execution_service: ExecutionService = Depends(get_execution_service)
):
    """Execute an agent"""
    try:
        execution = execution_service.execute_agent(
            agent_id,
            current_user.id,
            execute_data.input,
            execute_data.parameters,
            execute_data.session_id
        )

        return AgentExecuteResponse(
            execution_id=str(execution.id),
            status=execution.status.value,
            message="Agent execution started",
            response=execution.output,
            session_id=execution.session_id
        )
    except Exception as e:
        logger.error("Failed to execute agent", error=str(e), agent_id=str(agent_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute agent: {str(e)}"
        )


@router.get("/{agent_id}/executions")
async def get_agent_executions(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),  # Changed
    execution_service: ExecutionService = Depends(get_execution_service)
):
    """Get execution history for an agent"""
    try:
        executions = execution_service.get_agent_executions(agent_id, current_user.id)
        return executions
    except Exception as e:
        logger.error("Failed to get executions", error=str(e), agent_id=str(agent_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get executions: {str(e)}"
        )


@router.post("/{agent_id}/embeddings")
async def create_agent_embeddings(
    agent_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),  # Changed
    embedding_service: EmbeddingService = Depends(get_embedding_service)
):
    """Create embeddings from uploaded file"""
    try:
        content = await file.read()
        text = content.decode('utf-8')

        embeddings = embedding_service.create_embeddings(
            agent_id,
            current_user.id,
            text
        )

        return {
            "message": "Embeddings created successfully",
            "count": len(embeddings)
        }
    except Exception as e:
        logger.error("Failed to create embeddings", error=str(e), agent_id=str(agent_id))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create embeddings: {str(e)}"
        )
